import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteEntry = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");

const build = spawnSync(
  process.execPath,
  [viteEntry, "build", "--configLoader", "runner"],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const preview = spawn(
  process.execPath,
  [
    viteEntry,
    "preview",
    "--configLoader",
    "runner",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    preview.kill(signal);
  });
}

preview.on("exit", (code) => {
  process.exit(code ?? 0);
});
