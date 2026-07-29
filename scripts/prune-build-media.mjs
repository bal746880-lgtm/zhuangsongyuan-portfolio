import { readFile, readdir, rm, rmdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(projectRoot, "dist");
const manifestPath = path.join(distRoot, "portfolio", "manifest.json");
const excludedWalkthrough = path.join(
  distRoot,
  "portfolio",
  "人物完整跑图",
  "跑图总览.mp4",
);
const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
]);

function assertInsideDist(filePath) {
  if (
    filePath === distRoot ||
    !filePath.startsWith(`${distRoot}${path.sep}`)
  ) {
    throw new Error(`Refusing to modify a path outside dist: ${filePath}`);
  }
}

function flattenFiles(folder) {
  return [
    ...(folder.files ?? []),
    ...(folder.children ?? []).flatMap(flattenFiles),
  ];
}

function distPathFromUrl(url) {
  const pathname = new URL(url, "https://local.invalid").pathname;
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.join(distRoot, ...decoded.split("/"));
  assertInsideDist(filePath);
  return path.normalize(filePath);
}

async function walkFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

async function removeEmptyDirectories(directory, removeRoot = true) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }

  let removedDirectories = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    removedDirectories += await removeEmptyDirectories(
      path.join(directory, entry.name),
    );
  }

  const remainingEntries = await readdir(directory);
  if (removeRoot && remainingEntries.length === 0) {
    assertInsideDist(directory);
    await rmdir(directory);
    removedDirectories += 1;
  }

  return removedDirectories;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const manifestFiles = Object.values(manifest.chapters ?? {}).flatMap(flattenFiles);
const selectedImages = new Set(
  manifestFiles
    .filter(
      (file) => file.kind === "image" && file.isDisplayed !== false,
    )
    .flatMap((file) => [
      ...(file.displayVariants ?? []).map((variant) => variant.src),
      file.lightboxSrc ?? file.src ?? file.url,
    ])
    .map(distPathFromUrl),
);

for (const selectedImage of selectedImages) {
  try {
    const selectedStats = await stat(selectedImage);
    if (!selectedStats.isFile()) throw new Error("not a file");
  } catch {
    throw new Error(
      `Selected lossless image is missing from dist: ${selectedImage}`,
    );
  }
}

const candidateRoots = [
  path.join(distRoot, "portfolio"),
  path.join(distRoot, "portfolio-optimized-lossless"),
  path.join(distRoot, "portfolio-optimized-q92"),
];
const imageCandidates = (
  await Promise.all(candidateRoots.map(walkFiles))
)
  .flat()
  .filter((filePath) =>
    imageExtensions.has(path.extname(filePath).toLowerCase()),
  );

let removedImageVariants = 0;
for (const candidate of imageCandidates) {
  const normalized = path.normalize(candidate);
  if (selectedImages.has(normalized)) continue;
  assertInsideDist(normalized);
  await rm(normalized, { force: true });
  removedImageVariants += 1;
}

assertInsideDist(excludedWalkthrough);
await rm(excludedWalkthrough, { force: true });

const removedEmptyDirectories = (
  await Promise.all(
    candidateRoots.map((directory) =>
      removeEmptyDirectories(directory, directory !== path.join(distRoot, "portfolio")),
    ),
  )
).reduce((total, count) => total + count, 0);

console.log(
  `Build media pruned: kept ${selectedImages.size} selected images, removed ${removedImageVariants} unused image variants and ${removedEmptyDirectories} empty media directories, and excluded the local walkthrough MP4.`,
);
