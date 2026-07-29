import { rm } from "node:fs/promises";
import path from "node:path";
import {
  compareDecodedPixels,
  decodeRgba,
  loadSharp,
  projectRoot,
  readJson,
  reportJsonPath,
  outputsRoot,
  writeJson,
} from "./media-lossless-utils.mjs";

const sharp = await loadSharp();
const report = await readJson(reportJsonPath);
const verificationResults = [];

for (const image of report.images) {
  const originalPath = path.join(
    projectRoot,
    image.originalPath.split("/").join(path.sep),
  );
  const originalMetadata = await sharp(originalPath, {
    failOn: "error",
    limitInputPixels: false,
  }).metadata();
  const originalDecoded = await decodeRgba(sharp, originalPath);

  for (const [candidateName, candidate] of [
    ["optimizedPng", image.optimizedPng],
    ["losslessWebp", image.losslessWebp],
  ]) {
    if (!candidate?.retained || !candidate.outputPath) continue;

    const candidatePath = path.join(
      projectRoot,
      candidate.outputPath.split("/").join(path.sep),
    );
    const candidateMetadata = await sharp(candidatePath, {
      failOn: "error",
      limitInputPixels: false,
    }).metadata();
    const candidateDecoded = await decodeRgba(sharp, candidatePath);
    const validation = compareDecodedPixels({
      originalDecoded,
      candidateDecoded,
      originalMetadata,
      candidateMetadata,
    });

    if (!validation.passed) {
      await rm(candidatePath, { force: true });
    }

    verificationResults.push({
      originalPath: image.originalPath,
      candidateName,
      candidatePath: candidate.outputPath,
      passed: validation.passed,
      failedChecks: validation.failedChecks,
      removedAfterFailure: !validation.passed,
    });
  }
}

const failures = verificationResults.filter((result) => !result.passed);
const outputPath = path.join(
  outputsRoot,
  "lossless-image-verification.json",
);

await writeJson(outputPath, {
  generatedAt: new Date().toISOString(),
  checkedCandidateCount: verificationResults.length,
  failureCount: failures.length,
  results: verificationResults,
});

console.log(`Checked candidates: ${verificationResults.length}`);
console.log(`Failures: ${failures.length}`);
console.log(`Verification report: ${outputPath}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
