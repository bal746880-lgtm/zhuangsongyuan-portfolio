import { readFile, readdir, rm, rmdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(projectRoot, "dist");
const manifestPath = path.join(distRoot, "portfolio", "manifest.json");
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
const videoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);

function assertInsideDist(filePath) {
  const relative = path.relative(distRoot, path.resolve(filePath));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Refusing to modify a path outside dist: ${filePath}`);
  }
}

function pathKey(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
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
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw new Error(`Unable to scan build directory: ${directory}`, {
      cause: error,
    });
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
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw new Error(`Unable to inspect build directory: ${directory}`, {
      cause: error,
    });
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

try {
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
      .map(distPathFromUrl)
      .map(pathKey),
  );
  const selectedVideos = new Set(
    manifestFiles
      .filter(
        (file) => file.kind === "video" && file.isDisplayed !== false,
      )
      .map((file) => file.src ?? file.url)
      .map(distPathFromUrl)
      .map(pathKey),
  );

  for (const [label, selectedFiles] of [
    ["image", selectedImages],
    ["video", selectedVideos],
  ]) {
    for (const selectedFile of selectedFiles) {
      try {
        const selectedStats = await stat(selectedFile);
        if (!selectedStats.isFile()) throw new Error("not a file");
      } catch {
        throw new Error(`Selected ${label} is missing from dist: ${selectedFile}`);
      }
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
    const normalized = path.resolve(candidate);
    if (selectedImages.has(pathKey(normalized))) continue;
    assertInsideDist(normalized);
    await rm(normalized, { force: true });
    removedImageVariants += 1;
  }

  const videoCandidates = (
    await walkFiles(path.join(distRoot, "portfolio"))
  ).filter((filePath) =>
    videoExtensions.has(path.extname(filePath).toLowerCase()),
  );
  let removedUnusedVideos = 0;
  for (const candidate of videoCandidates) {
    const normalized = path.resolve(candidate);
    if (selectedVideos.has(pathKey(normalized))) continue;
    assertInsideDist(normalized);
    await rm(normalized, { force: true });
    removedUnusedVideos += 1;
  }

  const removedEmptyDirectories = (
    await Promise.all(
      candidateRoots.map((directory) =>
        removeEmptyDirectories(
          directory,
          directory !== path.join(distRoot, "portfolio"),
        ),
      ),
    )
  ).reduce((total, count) => total + count, 0);

  console.log(
    `Build media pruned: kept ${selectedImages.size} selected images and ${selectedVideos.size} selected video, removed ${removedImageVariants} unused image variants, ${removedUnusedVideos} unused videos, and ${removedEmptyDirectories} empty media directories.`,
  );
} catch (error) {
  console.error("Build media pruning failed.");
  console.error(error?.stack ?? error);
  process.exitCode = 1;
}
