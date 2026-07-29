import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(projectRoot, "dist");
const excludedBuildFile = path.join(
  distRoot,
  "portfolio",
  "人物完整跑图",
  "跑图总览.mp4",
);

if (
  excludedBuildFile !== distRoot &&
  !excludedBuildFile.startsWith(`${distRoot}${path.sep}`)
) {
  throw new Error("Refusing to remove a file outside the dist directory.");
}

await rm(excludedBuildFile, { force: true });
console.log(
  "Excluded the local walkthrough MP4 from dist; the Bilibili embed remains active.",
);
