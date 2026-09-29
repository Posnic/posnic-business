import { scryptAsync } from "@noble/hashes/scrypt.js";
import { gcm } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { z } from "zod";
import { communityOrigin } from "../domain/server";

export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export const credentialSchema = z
  .object({
    origin: z.string().refine((value) => {
      try {
        return communityOrigin(value) === value;
      } catch {
        return false;
      }
    }),
    token: z.string().regex(/^pb1_[A-Za-z0-9_-]{43}$/),
    expiresAt: z.string().datetime(),
    authorizationOrigin: z.string().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.authorizationOrigin === undefined ||
      value.authorizationOrigin === value.origin ||
      value.authorizationOrigin === "https://www.posnic.com",
    "Unexpected authorization origin",
  );
export type Credential = z.infer<typeof credentialSchema>;
const recordSchema = z
  .object({
    version: z.literal(1),
    salt: z.string().regex(/^[a-f0-9]{32}$/),
    nonce: z.string().regex(/^[a-f0-9]{24}$/),
    data: z
      .string()
      .min(32)
      .max(8192)
      .regex(/^[a-f0-9]+$/),
    failures: z.number().int().min(0).max(5),
  })
  .strict();
const RECORD = "business.pin.v1",
  SECRET = "business.install-secret.v1";
export class VaultError extends Error {
  constructor(
    public readonly code:
      | "pinWeak"
      | "pinIncorrect"
      | "pinLocked"
      | "signInRequired"
      | "storageUnavailable",
  ) {
    super(code);
  }
}
export function validPin(pin: string) {
  return (
    /^\d{6}$/.test(pin) &&
    !/^(\d)\1{5}$/.test(pin) &&
    !/^(\d\d)\1\1$/.test(pin) &&
    !/^(\d\d\d)\1$/.test(pin) &&
    ![
      "123456",
      "654321",
      "012345",
      "543210",
      "111222",
      "112233",
      "000000",
    ].includes(pin) &&
    ![1, -1].some((step) =>
      [...pin].slice(1).every((digit, i) => +digit === +pin[i]! + step),
    )
  );
}
/** Only minimal Business credentials are persisted; never passwords or report data. */
export class SessionVault {
  private generation = 0;
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    private store: SecretStore,
    private random: (size: number) => Promise<Uint8Array>,
    private now = Date.now,
  ) {}
  lock() {
    this.generation++;
  }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn);
    this.tail = next.catch(() => {});
    return next;
  }
  async hasCredential() {
    return (await this.store.get(RECORD)) !== null;
  }
  /** Non-secret enrollment binding. A replacement PIN vault or exhausted PIN
   * budget also invalidates its optional biometric credential. */
  biometricBinding(): Promise<string | null> {
    const generation = this.generation;
    return this.serial(async () => {
      if (generation !== this.generation) return null;
      const raw = await this.store.get(RECORD);
      try {
        const record = recordSchema.parse(JSON.parse(raw ?? "null"));
        return record.failures < 5 ? record.salt : null;
      } catch {
        return null;
      }
    });
  }
  private async derive(
    pin: string,
    salt: string,
    secret: string,
    generation: number,
  ) {
    const started = this.now();
    return scryptAsync(
      new TextEncoder().encode(pin),
      hexToBytes(salt + secret),
      {
        N: 32768,
        r: 8,
        p: 1,
        dkLen: 32,
        maxmem: 64 * 1024 * 1024,
        asyncTick: 8,
        onProgress: () => {
          if (generation !== this.generation || this.now() - started > 20_000)
            throw new VaultError("pinLocked");
        },
      },
    );
  }
  enroll(credential: Credential, pin: string) {
    const generation = this.generation;
    return this.serial(async () => {
      if (!validPin(pin)) throw new VaultError("pinWeak");
      const value = credentialSchema.parse(credential);
      if (Date.parse(value.expiresAt) <= this.now())
        throw new VaultError("signInRequired");
      const salt = bytesToHex(await this.random(16)),
        nonce = await this.random(12);
      let secret = await this.store.get(SECRET);
      if (!secret) {
        secret = bytesToHex(await this.random(32));
        await this.store.set(SECRET, secret);
      }
      if (!/^[a-f0-9]{64}$/.test(secret))
        throw new VaultError("storageUnavailable");
      const key = await this.derive(pin, salt, secret, generation);
      try {
        const data = bytesToHex(
          gcm(key, nonce).encrypt(
            new TextEncoder().encode(JSON.stringify(value)),
          ),
        );
        if (generation !== this.generation) throw new VaultError("pinLocked");
        await this.store.set(
          RECORD,
          JSON.stringify({
            version: 1,
            salt,
            nonce: bytesToHex(nonce),
            data,
            failures: 0,
          }),
        );
        if (generation !== this.generation) throw new VaultError("pinLocked");
      } finally {
        key.fill(0);
      }
    });
  }
  unlock(pin: string): Promise<Credential> {
    const generation = this.generation;
    return this.serial(async () => {
      if (generation !== this.generation) throw new VaultError("pinLocked");
      const raw = await this.store.get(RECORD),
        secret = await this.store.get(SECRET);
      if (!raw || !secret || !/^[a-f0-9]{64}$/.test(secret))
        throw new VaultError("signInRequired");
      let record: z.infer<typeof recordSchema>;
      try {
        record = recordSchema.parse(JSON.parse(raw));
      } catch {
        throw new VaultError("signInRequired");
      }
      if (record.failures >= 5) throw new VaultError("signInRequired");
      // Reserve the attempt durably before doing work. Killing the process or
      // parallel presses cannot reset the budget or race a later successful write.
      await this.store.set(
        RECORD,
        JSON.stringify({ ...record, failures: record.failures + 1 }),
      );
      if (!/^\d{6}$/.test(pin))
        throw new VaultError(
          record.failures === 4 ? "signInRequired" : "pinIncorrect",
        );
      const key = await this.derive(pin, record.salt, secret, generation);
      let credential: Credential;
      try {
        const plain = gcm(key, hexToBytes(record.nonce)).decrypt(
          hexToBytes(record.data),
        );
        try {
          credential = credentialSchema.parse(
            JSON.parse(new TextDecoder().decode(plain)),
          );
        } finally {
          plain.fill(0);
        }
      } catch {
        throw new VaultError(
          record.failures === 4 ? "signInRequired" : "pinIncorrect",
        );
      } finally {
        key.fill(0);
      }
      if (generation !== this.generation) throw new VaultError("pinLocked");
      if (Date.parse(credential.expiresAt) <= this.now())
        throw new VaultError("signInRequired");
      await this.store.set(RECORD, JSON.stringify({ ...record, failures: 0 }));
      if (generation !== this.generation) throw new VaultError("pinLocked");
      return credential;
    });
  }
  forget() {
    this.lock();
    return this.serial(async () => {
      await this.store.remove(RECORD);
      await this.store.remove(SECRET);
    });
  }
}
