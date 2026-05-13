import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repo, "dist", "static");
const viteBin = path.join(repo, "node_modules", "vite", "bin", "vite.js");

const build = spawnSync(
  process.execPath,
  [viteBin, "build", "--config", "./vite.static.config.ts"],
  {
    cwd: repo,
    stdio: "inherit",
    shell: false,
  },
);

if (build.error) {
  throw build.error;
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const finalIndex = path.join(outDir, "index.html");

if (!existsSync(finalIndex)) {
  throw new Error(`Static build did not create ${finalIndex}`);
}

writeFileSync(path.join(outDir, "_redirects"), "/* /index.html 200\n", "utf8");

console.log(`Static build ready: ${outDir}`);
