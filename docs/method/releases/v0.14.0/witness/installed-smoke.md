# Installed v0.14.0 smoke witness

Run from a checkout containing this receipt, with tag `v0.14.0` available
locally. The command restores the retained installation lockfile into a new
temporary prefix using `npm ci`; it never changes the running installation.
All 193 dependency entries in the retained lockfile carry registry URLs and
SHA-512 integrity values. npm still needs access to those recorded artifacts.

Fixture source comes from the release tag, independently of the checkout's
current source files. The command checks the installed package and SDK,
uses 30-second tool-request deadlines, closes the MCP client, and disposes
the bitmap objects. It does not connect to the live daemon. Node 26.0.0 on
Darwin ARM64 with npm 11.12.1 reproduces the recorded platform; other environments constitute
new portability observations.

```sh
set -eu
export GRAFT_RELEASE_CHECKOUT="$(git rev-parse --show-toplevel)"
export GRAFT_RELEASE_INSTALL="$(mktemp -d "${TMPDIR:-/tmp}/graft-v0140-install-replay.XXXXXX")"
cp "$GRAFT_RELEASE_CHECKOUT/docs/method/releases/v0.14.0/witness/install/package.json" "$GRAFT_RELEASE_INSTALL/"
cp "$GRAFT_RELEASE_CHECKOUT/docs/method/releases/v0.14.0/witness/install/package-lock.json" "$GRAFT_RELEASE_INSTALL/"
cd "$GRAFT_RELEASE_INSTALL"
npm ci --omit=dev --ignore-scripts
node --max-old-space-size=512 --input-type=module <<'GRAFT_DOGFOOD'
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const { getRoaringBitmap32, getNativeRoaringAvailable } = await import("./node_modules/@git-stunts/git-warp/src/domain/utils/roaring.js");
const Bitmap = getRoaringBitmap32();
const bitmap = new Bitmap([1,3,42]);
const decoded = Bitmap.deserialize(bitmap.serialize(true),true);
assert.deepEqual(decoded.toArray(),[1,3,42]);
const nativeRoaring = getNativeRoaringAvailable();
bitmap.dispose(); decoded.dispose();
const { DEFAULT_MAX_WARP_RESIDENTS, resolveWarpPoolOptions } = await import("./node_modules/@flyingrobots/graft/dist/mcp/warp-pool.js");
assert.equal(DEFAULT_MAX_WARP_RESIDENTS,4);
assert.deepEqual(resolveWarpPoolOptions({}),{});
const root = await fs.mkdtemp(path.join(os.tmpdir(), "graft-v0140-dogfood-"));
const source = process.env["GRAFT_RELEASE_CHECKOUT"];
assert(source,"Set GRAFT_RELEASE_CHECKOUT to the release checkout");
const installed = path.join(process.cwd(),"node_modules/@flyingrobots/graft");
assert.equal(execFileSync("git",["rev-parse","v0.14.0^{commit}"],{cwd:source,encoding:"utf8"}).trim(),"8d02bcf84463ac853f8346d2c7e563ecef9a3589");
for (const file of ["src/parser/lang.ts", "src/mcp/server.ts"]) {
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.writeFile(path.join(root,file),execFileSync("git",["show","v0.14.0:"+file],{cwd:source,stdio:"pipe"}));
}
const git = args => execFileSync("git",args,{cwd:root,stdio:"pipe",env:{...process.env,GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_NOSYSTEM:"1"}});
git(["init","--quiet"]); git(["add","src/parser/lang.ts","src/mcp/server.ts"]);
git(["-c","user.name=Graft release witness","-c","user.email=release@example.invalid","-c","commit.gpgsign=false","commit","--quiet","-m","Release dogfood source fixture"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([k,v]) => v !== undefined && !k.startsWith("GRAFT_") && !k.startsWith("GIT_")));
const transport = new StdioClientTransport({command:process.execPath,args:[path.join(installed,"bin/graft.js"),"serve"],cwd:root,env,stderr:"pipe"});
transport.stderr.on("data", chunk => process.stderr.write(chunk));
const client = new Client({name:"graft-release-dogfood",version:"0.14.0"},{capabilities:{}});
const outputs={root};
const call = async (name,args={}) => {
  const r=await client.callTool({name,arguments:args},undefined,{timeout:30000});
  assert(!r.isError,`${name} returned error: ${JSON.stringify(r)}`);
  const d=r.structuredContent ?? JSON.parse(r.content.find(c=>c.type==="text").text);
  outputs[name+Object.values(args).join(":")]=d;
  return d;
};
try {
 await client.connect(transport);
 const doctor=await call("doctor"); assert.equal(doctor.parserHealthy,true); assert.equal(doctor.thresholds.lines,150);
 const small=await call("safe_read",{path:"src/parser/lang.ts"}); assert.equal(small.projection,"content"); assert(small.content.length>0);
 const large=await call("safe_read",{path:"src/mcp/server.ts"}); assert.equal(large.projection,"outline"); assert(large.outline.length>0); assert(Object.keys(large.jumpTable).length>0);
 const outline=await call("file_outline",{path:"src/parser/lang.ts"}); assert(outline.outline.length>0); assert(Object.keys(outline.jumpTable).length>0);
 const stats=await call("stats"); assert(stats.totalReads>=1); assert(stats.totalOutlines>=1); assert(stats.totalBytesReturned>0);
 console.log(JSON.stringify({result:"pass",root,nativeRoaring,defaultMaxWarpResidents:DEFAULT_MAX_WARP_RESIDENTS,bitmapRoundtrip:[1,3,42],parserHealthy:doctor.parserHealthy,smallProjection:small.projection,largeProjection:large.projection,outlineEntries:outline.outline.length,totalReads:stats.totalReads,totalOutlines:stats.totalOutlines}));
} finally {
 await fs.writeFile(path.join(root,"dogfood-results.json"),JSON.stringify(outputs,null,2));
 await client.close();
}
GRAFT_DOGFOOD
```

## Recorded result

The temporary fixture path is omitted. This is a bounded smoke observation,
not exhaustive graph or memory validation.

```json
{
  "result": "pass",
  "nativeRoaring": false,
  "defaultMaxWarpResidents": 4,
  "bitmapRoundtrip": [
    1,
    3,
    42
  ],
  "parserHealthy": true,
  "smallProjection": "content",
  "largeProjection": "outline",
  "outlineEntries": 14,
  "totalReads": 1,
  "totalOutlines": 1
}
```
