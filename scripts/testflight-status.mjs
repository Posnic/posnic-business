import { sign } from "node:crypto";

const appId = "6818860502";
const version = process.env.BUSINESS_BUILD_NUMBER;
if (!/^\d+(?:\.\d+){0,2}$/.test(version || ""))
  throw new Error("Invalid build number");
const encoded = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const payload = [
  encoded({ alg: "ES256", kid: process.env.ASC_API_KEY_ID, typ: "JWT" }),
  encoded({
    iss: process.env.ASC_API_ISSUER,
    iat: now,
    exp: now + 300,
    aud: "appstoreconnect-v1",
  }),
].join(".");
const token =
  payload +
  "." +
  sign("sha256", Buffer.from(payload), {
    key: process.env.ASC_API_KEY_P8,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
async function get(path) {
  const response = await fetch(
    "https://api.appstoreconnect.apple.com/v1/" + path,
    {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      JSON.stringify({ status: response.status, errors: body.errors }),
    );
  return body;
}
const builds = await get(
  "builds?" +
    new URLSearchParams({
      "filter[app]": appId,
      "filter[version]": version,
      include: "buildBetaDetail",
      limit: "10",
    }),
);
for (const build of builds.data) {
  const groups = await get(`builds/${build.id}/betaGroups?limit=100`);
  console.log(
    JSON.stringify({
      build: build.id,
      version: build.attributes.version,
      processingState: build.attributes.processingState,
      usesNonExemptEncryption: build.attributes.usesNonExemptEncryption,
      betaDetail: builds.included
        ?.filter((row) => row.type === "buildBetaDetails")
        .map((row) => row.attributes),
      groups: groups.data.map((group) => ({
        id: group.id,
        name: group.attributes.name,
        internal: group.attributes.isInternalGroup,
      })),
    }),
  );
}
if (!builds.data.length)
  console.log(
    JSON.stringify({ version, status: "Not yet visible in App Store Connect" }),
  );
const groups = await get(`apps/${appId}/betaGroups?limit=100`);
console.log(
  JSON.stringify({
    availableGroups: groups.data.map((group) => ({
      id: group.id,
      name: group.attributes.name,
      internal: group.attributes.isInternalGroup,
      allBuilds: group.attributes.hasAccessToAllBuilds,
    })),
  }),
);
