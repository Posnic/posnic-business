import { sampleContext } from "../../src/data/sample";
export const account = {
  ...sampleContext("manager"),
  businessName: "PIN test business",
  capabilities: [],
};
// No credentials or production traffic: installed only in the isolated QA build.
export const businessFetch: typeof fetch = async (input) => {
  const url = String(input);
  const body = url.endsWith("/context")
    ? account
    : url.endsWith("/session")
      ? { revoked: true }
      : { error: { code: "unavailable" } };
  return new Response(JSON.stringify(body), {
    status: url.endsWith("/context") || url.endsWith("/session") ? 200 : 503,
    headers: { "content-type": "application/json" },
  });
};
