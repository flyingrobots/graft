# Replay the v0.14.0 MCP smoke witness

Run from the repository root at the v0.14.0 release commit. The command uses
copies of Graft source in a fresh temporary Git repository, starts a built
stdio MCP process, checks the responses, and closes the client. Each request
has a 30-second timeout. The final output names the temporary result directory.

```sh
pnpm install --frozen-lockfile
pnpm build
node --max-old-space-size=512 --input-type=module <<'GRAFT_DOGFOOD'
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "graft-v0140-dogfood-"));
const source = process.cwd();
for (const file of ["src/parser/lang.ts", "src/mcp/server.ts"]) {
  await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
  await fs.copyFile(path.join(source,file),path.join(root,file));
}
const git = args => execFileSync("git",args,{cwd:root,stdio:"pipe",env:{...process.env,GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_NOSYSTEM:"1"}});
git(["init","--quiet"]); git(["add","src/parser/lang.ts","src/mcp/server.ts"]);
git(["-c","user.name=Graft release witness","-c","user.email=release@example.invalid","-c","commit.gpgsign=false","commit","--quiet","-m","Release dogfood source fixture"]);
const env = Object.fromEntries(Object.entries(process.env).filter(([k,v]) => v !== undefined && !k.startsWith("GRAFT_") && !k.startsWith("GIT_")));
const transport = new StdioClientTransport({command:process.execPath,args:[path.join(source,"bin/graft.js"),"serve"],cwd:root,env,stderr:"pipe"});
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
 console.log(JSON.stringify({result:"pass",root,parserHealthy:doctor.parserHealthy,smallProjection:small.projection,largeProjection:large.projection,outlineEntries:outline.outline.length,totalReads:stats.totalReads,totalOutlines:stats.totalOutlines}));
} finally {
 await fs.writeFile(path.join(root,"dogfood-results.json"),JSON.stringify(outputs,null,2));
 await client.close();
}
GRAFT_DOGFOOD
```
