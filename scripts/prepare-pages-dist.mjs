import {
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(projectRoot, "dist");
const pagesRoot = path.join(projectRoot, "pages-dist");
const publicManifestPath = path.join(
  projectRoot,
  "public",
  "portfolio",
  "manifest.json",
);
const distManifestRelativePath = "portfolio/manifest.json";
const outputsRoot = path.join(projectRoot, "outputs");
const prepareReportPath = path.join(
  outputsRoot,
  "pages-dist-prepare-report.json",
);
const expectedDronePath = "portfolio/无人机/无人机2.mp4";
const mediaExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
]);
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
const provenanceKeys = new Set([
  "originalPath",
  "optimizedPath",
  "losslessPath",
  "q92Path",
]);
const optionalRootFiles = new Set([
  "CNAME",
  ".nojekyll",
  "404.html",
  "favicon.ico",
  "favicon.svg",
  "site.webmanifest",
  "manifest.webmanifest",
  "robots.txt",
]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function assertInside(root, candidate, allowRoot = false) {
  const relative = path.relative(root, path.resolve(candidate));
  if (
    (!allowRoot && relative === "") ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path escapes ${root}: ${candidate}`);
  }
}

function normalizedAssetPath(value) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    (!trimmed.startsWith("/") &&
      !trimmed.startsWith("./") &&
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("https://"))
  ) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(trimmed, "https://local.invalid");
  } catch {
    throw new Error(`Invalid manifest URL: ${value}`);
  }
  if (parsed.hostname !== "local.invalid") return null;

  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error(`Unable to decode manifest URL: ${value}`);
  }
  const normalized = pathname
    .replaceAll("\\", "/")
    .normalize("NFC")
    .replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (
    !normalized ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Unsafe manifest path: ${value}`);
  }
  const extension = path.posix.extname(normalized).toLowerCase();
  return mediaExtensions.has(extension) ? normalized : null;
}

function collectStringAssets(value, output) {
  for (const candidate of value.split(",")) {
    const token = candidate.trim().split(/\s+/)[0];
    const normalized = normalizedAssetPath(token);
    if (normalized) output.set(normalized, normalized);
  }
}

export function collectManifestMediaPaths(manifest) {
  const paths = new Map();

  function visit(value, key = "") {
    if (provenanceKeys.has(key)) return;
    if (typeof value === "string") {
      collectStringAssets(value, paths);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, key);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (value.isDisplayed === false) return;
    for (const [childKey, childValue] of Object.entries(value)) {
      visit(childValue, childKey);
    }
  }

  visit(manifest);
  return [...paths.values()].sort((left, right) =>
    left.localeCompare(right, "zh-CN"),
  );
}

async function walkFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
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

async function copyRelative(relativePath) {
  const source = path.resolve(distRoot, ...relativePath.split("/"));
  const destination = path.resolve(pagesRoot, ...relativePath.split("/"));
  assertInside(distRoot, source);
  assertInside(pagesRoot, destination);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

function htmlReferencedRootFiles(html) {
  const references = new Set();
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1];
    let parsed;
    try {
      parsed = new URL(value, "https://local.invalid");
    } catch {
      continue;
    }
    if (parsed.hostname !== "local.invalid") continue;
    const relativePath = decodeURIComponent(parsed.pathname)
      .replaceAll("\\", "/")
      .normalize("NFC")
      .replace(/^\/+/, "");
    if (
      relativePath &&
      !relativePath.startsWith("assets/") &&
      !mediaExtensions.has(path.posix.extname(relativePath).toLowerCase())
    ) {
      references.add(relativePath);
    }
  }
  return references;
}

async function main() {
  assertInside(projectRoot, pagesRoot);
  await rm(pagesRoot, { recursive: true, force: true });
  await mkdir(pagesRoot, { recursive: true });

  try {
    const [manifestText, indexHtml] = await Promise.all([
      readFile(publicManifestPath, "utf8"),
      readFile(path.join(distRoot, "index.html"), "utf8"),
    ]);
    const manifest = JSON.parse(manifestText);
    const mediaPaths = collectManifestMediaPaths(manifest);
    const originalImagePaths = mediaPaths.filter(
      (relativePath) =>
        relativePath.startsWith("portfolio/") &&
        imageExtensions.has(path.posix.extname(relativePath).toLowerCase()),
    );
    if (originalImagePaths.length) {
      throw new Error(
        `Final manifest still selects original images:\n${originalImagePaths.join("\n")}`,
      );
    }
    const videoPaths = mediaPaths.filter((relativePath) =>
      videoExtensions.has(path.posix.extname(relativePath).toLowerCase()),
    );
    const unexpectedVideos = videoPaths.filter(
      (relativePath) => relativePath !== expectedDronePath,
    );
    if (unexpectedVideos.length || !videoPaths.includes(expectedDronePath)) {
      throw new Error(
        `Unexpected manifest video selection:\n${videoPaths.join("\n")}`,
      );
    }

    const requiredPaths = new Set([
      "index.html",
      distManifestRelativePath,
      ...mediaPaths,
    ]);
    for (const name of optionalRootFiles) {
      try {
        const fileStats = await stat(path.join(distRoot, name));
        if (fileStats.isFile()) requiredPaths.add(name);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    for (const relativePath of htmlReferencedRootFiles(indexHtml)) {
      requiredPaths.add(relativePath);
    }

    const missing = [];
    for (const relativePath of requiredPaths) {
      const source = path.resolve(distRoot, ...relativePath.split("/"));
      assertInside(distRoot, source);
      try {
        const fileStats = await stat(source);
        if (!fileStats.isFile()) missing.push(relativePath);
      } catch {
        missing.push(relativePath);
      }
    }
    const assetsSource = path.join(distRoot, "assets");
    try {
      const assetsStats = await stat(assetsSource);
      if (!assetsStats.isDirectory()) missing.push("assets/");
    } catch {
      missing.push("assets/");
    }
    if (missing.length) {
      throw new Error(
        `Manifest or shell resources are missing from dist:\n${missing.join("\n")}`,
      );
    }

    for (const relativePath of requiredPaths) {
      await copyRelative(relativePath);
    }
    await cp(assetsSource, path.join(pagesRoot, "assets"), {
      recursive: true,
      force: true,
    });

    const copiedFiles = await walkFiles(pagesRoot);
    const copiedMedia = copiedFiles.filter((filePath) =>
      mediaExtensions.has(path.extname(filePath).toLowerCase()),
    );
    const report = {
      generatedAt: new Date().toISOString(),
      sourceManifest: toPosix(
        path.relative(projectRoot, publicManifestPath),
      ),
      inputDirectory: "dist",
      outputDirectory: "pages-dist",
      manifestReferencedMediaCount: mediaPaths.length,
      copiedMediaCount: copiedMedia.length,
      copiedFileCount: copiedFiles.length,
      missingCount: 0,
      missing: [],
      videoPaths,
      originalImageCount: 0,
      mediaPaths,
    };
    await mkdir(outputsRoot, { recursive: true });
    await writeFile(
      prepareReportPath,
      JSON.stringify(report, null, 2),
      "utf8",
    );
    console.log(`Manifest referenced media: ${mediaPaths.length}`);
    console.log(`Copied media: ${copiedMedia.length}`);
    console.log(`Copied files: ${copiedFiles.length}`);
    console.log("Missing resources: 0");
    console.log(`Pages preparation report: ${prepareReportPath}`);
  } catch (error) {
    await rm(pagesRoot, { recursive: true, force: true });
    throw error;
  }
}

const directRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directRun) {
  main().catch((error) => {
    console.error("Pages deployment preparation failed.");
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}
