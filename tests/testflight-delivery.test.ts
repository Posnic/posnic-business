import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function run(mode: string, distribute = false) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { generateKeyPairSync } from "node:crypto";
    process.env.ASC_API_KEY_P8 = generateKeyPairSync("ec", {namedCurve:"prime256v1"}).privateKey.export({type:"pkcs8",format:"pem"});
    process.env.BUSINESS_BUILD_NUMBER="1020";
    process.env.BUSINESS_DISTRIBUTE=${JSON.stringify(String(distribute))};
    const group={id:"1dfcdb9b-0dfe-4881-8ca1-4a14a8701057",attributes:{isInternalGroup:true}};
    const mode=${JSON.stringify(mode)};
    let assigned=mode==="assigned";
    globalThis.fetch=async (url,options)=>{
      if(!url.startsWith("https://api.appstoreconnect.apple.com/v1/"))throw Error("Foreign origin");
      if(options.method==="POST"){
        if(!url.endsWith("builds/build1020/relationships/betaGroups"))throw Error("Wrong build");
        if(JSON.parse(options.body).data[0].id!==group.id)throw Error("Wrong group");
        console.log("ASSIGNED");assigned=true;return new Response(null,{status:204});
      }
      let data;
      if(url.includes("/v1/builds?")) {
        if(!url.includes("6818860502")||!url.includes("1020"))throw Error("Missing app/build filter");
        data=mode==="missing"?[]:[{id:"build1020",attributes:{version:"1020",processingState:mode==="processing"?"PROCESSING":"VALID",expired:mode==="expired"}}];
        if(mode==="duplicate")data.push(data[0]);
      } else if(url.includes("/apps/"))data=mode==="foreign"?[]:[group];
      else if(url.includes("/relationships/builds"))data=assigned?[{type:"builds",id:"build1020"}]:[];
      else throw Error("Unsupported Apple relationship");
      return Response.json({data});
    };
    await import("./scripts/testflight-status.mjs");
  `,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
}
test("TestFlight status is read-only and delivery targets the verified existing group", () => {
  const status = run("ready");
  assert.equal(status.status, 0, status.stderr);
  assert.ok(!status.stdout.includes("ASSIGNED"));
  const delivery = run("ready", true);
  assert.equal(delivery.status, 0, delivery.stderr);
  assert.ok(delivery.stdout.includes("ASSIGNED"));
  const repeat = run("assigned", true);
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.ok(!repeat.stdout.includes("ASSIGNED"));
});
test("TestFlight delivery rejects missing, ambiguous, unprocessed, expired or foreign scope", () => {
  for (const mode of [
    "missing",
    "duplicate",
    "processing",
    "expired",
    "foreign",
  ]) {
    const result = run(mode, true);
    assert.notEqual(result.status, 0, mode);
    assert.ok(!result.stdout.includes("ASSIGNED"), mode);
  }
});
