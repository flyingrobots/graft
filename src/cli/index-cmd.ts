import { openWarp } from "../warp/open.js";
import { indexCommits } from "../warp/indexer.js";

export async function runIndex(): Promise<void> {
  const cwd = process.cwd();
  const from: string | undefined = process.argv[3];

  console.log(`\nIndexing structural history in ${cwd}\n`);

  const warp = await openWarp({ cwd });
  const result = await indexCommits(warp, { cwd, ...(from !== undefined ? { from } : {}) });

  console.log(`  commits indexed: ${String(result.commitsIndexed)}`);
  console.log(`  patches written: ${String(result.patchesWritten)}`);
  console.log("\nDone.\n");
}
