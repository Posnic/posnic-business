import { z } from "zod";
import { credentialSchema, type Credential } from "./sessionVault";
import { type BusinessContext } from "../domain/contracts";
import {
  readJson,
  discoverBusinessServer,
  ConnectionError,
  type Options,
} from "./businessConnection";

const words = z
  .record(z.string().max(4096), z.string().max(4096))
  .refine((value) => Object.keys(value).length <= 10000);
const bundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    locale: z.string().max(35),
    branchId: z.string(),
    profileId: z.string().nullable(),
    profileRevision: z.string().nullable(),
    profileName: z.string().max(160).nullable(),
    values: words,
    sourceValues: words,
  })
  .strict();

/** Dedicated Business session only; server rechecks current membership.
 * Unsupported servers keep bundled wording. No profile editing permission. */
export async function readBusinessWording(
  credential: Credential,
  context: BusinessContext,
  branchId: string,
  locale: string,
  options: Options = {},
) {
  credentialSchema.parse(credential);
  if (!context.branches.some((branch) => branch.id === branchId))
    throw new ConnectionError("accessChanged");
  const discovery = await discoverBusinessServer(credential.origin, {
    ...options,
    wording: true,
  });
  if (discovery.wordingProfiles !== "published-wording-v1")
    throw new ConnectionError("unsupported");
  const query = new URLSearchParams({ branchId, locale });
  const result = bundleSchema.safeParse(
    await readJson(
      credential.origin,
      "/wording?" + query,
      options,
      credential.token,
    ),
  );
  if (
    !result.success ||
    result.data.branchId !== branchId ||
    result.data.locale !== locale
  )
    throw new ConnectionError("invalidResponse");
  return result.data;
}
