import { access, copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function stageSitesWorker() {
  return {
    name: "stage-sites-worker",
    apply: "build",
    async closeBundle() {
      await mkdir(fileURLToPath(new URL("./dist/server/", import.meta.url)), { recursive: true });
      await copyFile(
        fileURLToPath(new URL("./worker/index.js", import.meta.url)),
        fileURLToPath(new URL("./dist/server/index.js", import.meta.url)),
      );
      const hostingSource = fileURLToPath(new URL("./.openai/hosting.json", import.meta.url));
      if (await exists(hostingSource)) {
        await mkdir(fileURLToPath(new URL("./dist/.openai/", import.meta.url)), { recursive: true });
        await copyFile(
          hostingSource,
          fileURLToPath(new URL("./dist/.openai/hosting.json", import.meta.url)),
        );
      }
    },
  };
}

export default defineConfig({
  root,
  base: "./",
  publicDir: "public",
  plugins: [stageSitesWorker()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
