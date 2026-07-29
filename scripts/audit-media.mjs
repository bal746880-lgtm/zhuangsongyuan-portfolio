import path from "node:path";
import {
  auditMedia,
  formatBytes,
  loadSharp,
  outputsRoot,
  writeJson,
} from "./media-lossless-utils.mjs";

const sharp = await loadSharp();
const audit = await auditMedia(sharp);
const outputPath = path.join(outputsRoot, "media-audit.json");

await writeJson(outputPath, audit);

console.log(`Images: ${audit.totals.imageCount}`);
console.log(`Image size: ${formatBytes(audit.totals.imageTotalBytes)}`);
console.log(`Videos: ${audit.totals.videoCount}`);
console.log(`Video size: ${formatBytes(audit.totals.videoTotalBytes)}`);
console.log(`Audit: ${outputPath}`);
