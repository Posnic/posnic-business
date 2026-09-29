import { z } from "zod";
import {
  registerCloseSchema,
  registerSummarySchema,
  validateRegisterClose,
  validateRegisterSummary,
} from "../domain/registerSummary";
import { type Credential } from "./sessionVault";
import { readJson, ConnectionError, type Options } from "./businessConnection";
import { type BusinessContext } from "../domain/contracts";
import {
  preparedOverviewSchema,
  validatePreparedOverview,
} from "../domain/preparedOverview";
const id = z.string().regex(/^[a-f\d]{24}$/);
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const preferenceSchema = z
  .object({
    branchId: id,
    timezone: z.string().min(1).max(100),
    revision: z.number().int().nonnegative().safe(),
    enabled: z.boolean(),
    time,
    quiet: z.object({ enabled: z.boolean(), start: time, end: time }).strict(),
    locale: z.enum([
      "en",
      "ta",
      "hi",
      "ml",
      "kn",
      "te",
      "si",
      "ne",
      "ar",
      "fr",
      "es",
      "pt",
      "id",
      "th",
      "de",
      "sw",
      "nl",
      "it",
    ]),
    channel: z.literal("inApp"),
    nextSendAt: z.string().datetime().nullable(),
  })
  .strict();
export type NotificationPreference = z.infer<typeof preferenceSchema>;
const dailyEntrySchema = z
  .object({
    id,
    branchId: id,
    kind: z.enum(["daily_summary", "daily_unavailable"]),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    createdAt: z.string().datetime(),
    read: z.boolean(),
    summary: preparedOverviewSchema.nullable(),
  })
  .strict();
const approvalEntrySchema = dailyEntrySchema.extend({
  kind: z.literal("approval_requested"),
  summary: z.null(),
  requestId: id,
  requestExpiresAt: z.string().datetime(),
});
const registerEntrySchema = dailyEntrySchema.extend({
  kind: z.enum(["register_summary", "register_unavailable"]),
  sessionId: id,
  close: registerCloseSchema,
  summary: registerSummarySchema.nullable(),
});
const entrySchema = z.discriminatedUnion("kind", [
  dailyEntrySchema,
  approvalEntrySchema,
  registerEntrySchema,
]);
export type InboxEntry = z.infer<typeof entrySchema>;
const inboxSchema = z
  .object({ entries: z.array(entrySchema).max(50), next: id.nullable() })
  .strict();
export function validateInbox(value: unknown, context: BusinessContext) {
  const result = inboxSchema.parse(value);
  if (!context.capabilities.includes("overview.read") && result.entries.length)
    throw new Error("Scope mismatch");
  if (
    new Set(result.entries.map((entry) => entry.id)).size !==
    result.entries.length
  )
    throw new Error("Duplicate entry");
  for (const entry of result.entries) {
    if (!context.branches.some((branch) => branch.id === entry.branchId))
      throw new Error("Scope mismatch");
    if (
      ["daily_summary", "register_summary"].includes(entry.kind) !==
      (entry.summary !== null)
    )
      throw new Error("Invalid summary state");
    if (
      entry.kind === "approval_requested" &&
      (!context.capabilities.includes("approvals.read") ||
        Date.parse(entry.requestExpiresAt) <= Date.parse(entry.createdAt))
    )
      throw new Error("Invalid approval scope or expiry");
    if (
      entry.kind === "register_summary" ||
      entry.kind === "register_unavailable"
    ) {
      validateRegisterClose(
        entry.close,
        context,
        entry.branchId,
        entry.sessionId,
      );
      if (
        entry.close.businessDate !== entry.businessDate ||
        Date.parse(entry.createdAt) < Date.parse(entry.close.eligibleAt)
      )
        throw new Error("Invalid register entry");
      if (entry.summary) {
        validateRegisterSummary(
          entry.summary,
          context,
          entry.branchId,
          entry.sessionId,
        );
        if (
          Object.keys(entry.close).some(
            (key) =>
              entry.close[key as keyof typeof entry.close] !==
              entry.summary!.close[key as keyof typeof entry.close],
          )
        )
          throw new Error("Register entry mismatch");
      }
    } else if (entry.summary)
      validatePreparedOverview(
        entry.summary,
        context,
        [entry.branchId],
        entry.businessDate,
      );
  }
  return result;
}
function preferencePath(branchId: string) {
  if (!id.safeParse(branchId).success)
    throw new ConnectionError("accessChanged");
  return "/notifications/preferences/" + branchId;
}
export async function readPreference(
  credential: Credential,
  branchId: string,
  options: Options,
) {
  const result = preferenceSchema.safeParse(
    await readJson(
      credential.origin,
      preferencePath(branchId),
      options,
      credential.token,
    ),
  );
  if (!result.success || result.data.branchId !== branchId)
    throw new ConnectionError("invalidResponse");
  return result.data;
}
export async function savePreference(
  credential: Credential,
  preference: NotificationPreference,
  options: Options,
) {
  const result = preferenceSchema.safeParse(
    await readJson(
      credential.origin,
      preferencePath(preference.branchId),
      options,
      credential.token,
      {
        method: "POST",
        body: {
          expectedRevision: preference.revision,
          enabled: preference.enabled,
          time: preference.time,
          quiet: preference.quiet,
          locale: preference.locale,
        },
      },
    ),
  );
  if (!result.success || result.data.branchId !== preference.branchId)
    throw new ConnectionError("invalidResponse");
  return result.data;
}
export async function readInbox(
  credential: Credential,
  context: BusinessContext,
  options: Options,
  before?: string,
) {
  if (before && !id.safeParse(before).success)
    throw new ConnectionError("invalidResponse");
  const query = new URLSearchParams();
  if (context.capabilities.includes("notifications.self.manage"))
    query.set("registerSessions", "1");
  if (before) query.set("before", before);
  // Explicitly opt in to this event shape. Older servers ignore this query
  // and continue to return their daily-only Inbox contract.
  if (context.capabilities.includes("approvals.read"))
    query.set("approvals", "1");
  const value = await readJson(
    credential.origin,
    "/inbox" + (query.size ? "?" + query.toString() : ""),
    options,
    credential.token,
  );
  try {
    return validateInbox(value, context);
  } catch {
    throw new ConnectionError("invalidResponse");
  }
}
export async function markInboxRead(
  credential: Credential,
  entryId: string,
  options: Options,
) {
  if (!id.safeParse(entryId).success)
    throw new ConnectionError("invalidResponse");
  const result = z
    .object({ read: z.literal(true) })
    .strict()
    .safeParse(
      await readJson(
        credential.origin,
        "/inbox/" + entryId + "/read",
        options,
        credential.token,
        { method: "POST", body: {} },
      ),
    );
  if (!result.success) throw new ConnectionError("invalidResponse");
}
