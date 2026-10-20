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
async function get(path, body) {
  const response = await fetch(
    "https://api.appstoreconnect.apple.com/v1/" + path,
    {
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    },
  );
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      JSON.stringify({ status: response.status, errors: result.errors }),
    );
  return result;
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
if (process.env.BUSINESS_DISTRIBUTE === "true" && builds.data.length !== 1)
  throw new Error("Distribution requires exactly one matching Business build");
async function hasBuild(groupId, buildId) {
  const result = await get(
    `betaGroups/${groupId}/relationships/builds?limit=200`,
  );
  if (result.links?.next)
    throw new Error("Group build history exceeds inspection limit");
  return result.data.some((build) => build.id === buildId);
}
for (const build of builds.data) {
  if (process.env.BUSINESS_DISTRIBUTE === "true") {
    if (
      build.attributes.processingState !== "VALID" ||
      build.attributes.expired
    )
      throw new Error("Build is not processed and available");
    const groupId = "1dfcdb9b-0dfe-4881-8ca1-4a14a8701057";
    const existing = await get(`apps/${appId}/betaGroups?limit=100`);
    if (
      !existing.data.some(
        (group) => group.id === groupId && group.attributes.isInternalGroup,
      )
    )
      throw new Error(
        "Existing Business internal tester group could not be verified",
      );
    if (!(await hasBuild(groupId, build.id)))
      await get(`builds/${build.id}/relationships/betaGroups`, {
        data: [{ type: "betaGroups", id: groupId }],
      });
    if (!(await hasBuild(groupId, build.id)))
      throw new Error("Tester assignment was not confirmed");
  }
  const available = await get(`apps/${appId}/betaGroups?limit=100`);
  const groups = [];
  for (const group of available.data)
    if (await hasBuild(group.id, build.id)) groups.push(group);
  console.log(
    JSON.stringify({
      build: build.id,
      version: build.attributes.version,
      processingState: build.attributes.processingState,
      usesNonExemptEncryption: build.attributes.usesNonExemptEncryption,
      betaDetail: builds.included
        ?.filter((row) => row.type === "buildBetaDetails")
        .map((row) => row.attributes),
      groups: groups.map((group) => ({
        id: group.id,
        name: group.attributes.name,
        internal: group.attributes.isInternalGroup,
      })),
    }),
  );
}
if (!builds.data.length && process.env.BUSINESS_DISTRIBUTE === "true")
  throw new Error("Build is not yet visible; no distribution performed");
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
