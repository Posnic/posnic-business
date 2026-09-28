import { z } from "zod";
import { communityOrigin } from "../domain/server";
import {
  contextSchema,
  validateOverview,
  type BusinessContext,
} from "../domain/contracts";

export const CLOUD_ORIGIN = "https://www.posnic.com";
export const BUSINESS_PATH = "/api/business/v1";
export type ConnectionProblem =
  | "unsupported"
  | "unreachable"
  | "timeout"
  | "cancelled"
  | "signInRequired"
  | "accessChanged"
  | "busy"
  | "invalidResponse";
export class ConnectionError extends Error {
  constructor(public readonly problem: ConnectionProblem) {
    super(problem);
    this.name = "ConnectionError";
  }
}

// Fixed relative endpoints: a discovery document cannot move credentials to
// another server, introduce selling permissions, or select arbitrary URLs.
const discoverySchema = z
  .object({
    product: z.literal("posnic-business"),
    apiVersion: z.literal(1),
    issuer: z.string(),
    authorization: z.literal("business-pkce-v1"),
    audience: z.literal("posnic-business"),
    reporting: z.literal("bounded-summary-v1"),
  })
  .strict();
export type Discovery = z.infer<typeof discoverySchema>;
type Options = {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

async function readJson(
  origin: string,
  path: string,
  options: Options,
  token?: string,
) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10_000);
  try {
    if (controller.signal.aborted) throw new ConnectionError("cancelled");
    const url = origin + BUSINESS_PATH + path;
    const response = await (options.fetcher ?? fetch)(url, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.redirected || (response.url && response.url !== url))
      throw new ConnectionError("invalidResponse");
    if (response.status === 401) throw new ConnectionError("signInRequired");
    if (response.status === 403) throw new ConnectionError("accessChanged");
    if ([404, 405, 426, 501].includes(response.status))
      throw new ConnectionError("unsupported");
    if ([429, 503].includes(response.status)) throw new ConnectionError("busy");
    if (!response.ok) throw new ConnectionError("unreachable");
    if (
      !response.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      throw new ConnectionError("invalidResponse");
    const raw = await response.text();
    if (raw.length > 256_000) throw new ConnectionError("invalidResponse");
    if (controller.signal.aborted)
      throw new ConnectionError(timedOut ? "timeout" : "cancelled");
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new ConnectionError("invalidResponse");
    }
  } catch (error) {
    if (controller.signal.aborted)
      throw new ConnectionError(timedOut ? "timeout" : "cancelled");
    if (error instanceof ConnectionError) throw error;
    throw new ConnectionError("unreachable");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export async function discoverBusinessServer(
  address: string,
  options: Options = {},
): Promise<Discovery> {
  const origin = communityOrigin(address);
  const parsed = discoverySchema.safeParse(
    await readJson(origin, "/discovery", options),
  );
  if (!parsed.success || parsed.data.issuer !== origin)
    throw new ConnectionError("unsupported");
  return parsed.data;
}

/** Transport foundation, not wired to live UI until the dedicated grant ships.
 * Native transport must qualify redirect rejection before receiving a token.
 */
export function createReportingClient(
  address: string,
  token: string,
  options: Options & { fetcher: typeof fetch },
) {
  const origin = communityOrigin(address);
  // Business opaque tokens are deliberately distinct from existing POS JWTs.
  if (!/^pb1_[A-Za-z0-9_-]{43}$/.test(token))
    throw new ConnectionError("signInRequired");
  return {
    async context(): Promise<BusinessContext> {
      const parsed = contextSchema.safeParse(
        await readJson(origin, "/context", options, token),
      );
      if (!parsed.success) throw new ConnectionError("invalidResponse");
      return parsed.data;
    },
    async overview(
      context: BusinessContext,
      branchIds: string[],
      businessDate: string,
    ) {
      if (
        !context.capabilities.includes("overview.read") ||
        !branchIds.length ||
        new Set(branchIds).size !== branchIds.length ||
        branchIds.length > 100 ||
        branchIds.some((id) => !context.branches.some((b) => b.id === id))
      )
        throw new ConnectionError("accessChanged");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(businessDate) ||
        !Number.isFinite(Date.parse(businessDate)) ||
        new Date(businessDate).toISOString().slice(0, 10) !== businessDate
      )
        throw new ConnectionError("invalidResponse");
      const query = new URLSearchParams({ businessDate });
      branchIds.forEach((id) => query.append("branchId", id));
      const value = await readJson(
        origin,
        `/overview?${query}`,
        options,
        token,
      );
      try {
        const result = validateOverview(value, context, branchIds);
        if (result.businessDate !== businessDate)
          throw new Error("Date mismatch");
        return result;
      } catch {
        throw new ConnectionError("invalidResponse");
      }
    },
  };
}
