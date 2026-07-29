import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const sourceRoot = path.join(projectRoot, "public", "portfolio");
export const optimizedRoot = path.join(
  projectRoot,
  "public",
  "portfolio-optimized-lossless",
);
export const outputsRoot = path.join(projectRoot, "outputs");
export const reportJsonPath = path.join(
  outputsRoot,
  "lossless-image-optimization-report.json",
);
export const reportMarkdownPath = path.join(
  outputsRoot,
  "lossless-image-optimization-report.md",
);

export const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
]);
export const videoExtensions = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
]);

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function projectRelative(value) {
  return toPosix(path.relative(projectRoot, value));
}

export function sourceRelative(value) {
  return toPosix(path.relative(sourceRoot, value));
}

export function formatBytes(bytes) {
  if (bytes == null) return "—";
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export function formatPercent(value) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

export function savingsPercent(originalBytes, candidateBytes) {
  if (!originalBytes || candidateBytes == null) return null;
  return ((originalBytes - candidateBytes) / originalBytes) * 100;
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function listFiles(root) {
  if (!existsSync(root)) return [];
  const result = [];

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) =>
      left.name.localeCompare(right.name, "zh-CN", {
        numeric: true,
        sensitivity: "base",
      }),
    );

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  await visit(root);
  return result;
}

export async function directorySize(root) {
  const files = await listFiles(root);
  let totalBytes = 0;
  for (const file of files) {
    totalBytes += (await stat(file)).size;
  }
  return { fileCount: files.length, totalBytes };
}

export async function loadSharp() {
  const require = createRequire(import.meta.url);
  const searchRoots = [
    projectRoot,
    process.env.CODEX_BUNDLED_NODE_MODULES,
    path.join(
      homedir(),
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
    ),
  ].filter(Boolean);

  let lastError = null;
  for (const searchRoot of searchRoots) {
    try {
      const resolved = require.resolve("sharp", { paths: [searchRoot] });
      return require(resolved);
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error(
    "Sharp is required for lossless pixel verification. Run: npm.cmd install --save-dev sharp@0.34.5",
  );
  error.cause = lastError;
  throw error;
}

function hasBuffer(value) {
  return Buffer.isBuffer(value) && value.length > 0;
}

export function summarizeMetadata(metadata) {
  const hasIcc = Boolean(metadata.hasProfile || hasBuffer(metadata.icc));
  const hasExif = hasBuffer(metadata.exif);
  const hasXmp = hasBuffer(metadata.xmp);
  const hasIptc = hasBuffer(metadata.iptc);
  const hasPhotoshop = hasBuffer(metadata.tifftagPhotoshop);
  const hasComments =
    Array.isArray(metadata.comments) && metadata.comments.length > 0;
  const hasOtherMetadata = Boolean(
    hasXmp ||
      hasIptc ||
      hasPhotoshop ||
      hasComments ||
      metadata.orientation ||
      metadata.density ||
      metadata.pages ||
      metadata.pageHeight ||
      metadata.loop ||
      metadata.delay,
  );

  return {
    hasIcc,
    hasExif,
    hasXmp,
    hasIptc,
    hasPhotoshop,
    hasComments,
    hasOtherMetadata,
    orientation: metadata.orientation ?? null,
    density: metadata.density ?? null,
    isProgressive: metadata.isProgressive ?? null,
    isPalette: metadata.isPalette ?? null,
    pages: metadata.pages ?? null,
    pageHeight: metadata.pageHeight ?? null,
  };
}

export function shouldKeepMetadata(metadata) {
  const summary = summarizeMetadata(metadata);
  return Boolean(
    summary.hasIcc ||
      summary.hasExif ||
      summary.hasXmp ||
      summary.hasIptc ||
      summary.hasPhotoshop ||
      summary.orientation,
  );
}

export async function decodeRgba(sharp, filePath) {
  const { data, info } = await sharp(filePath, {
    failOn: "error",
    limitInputPixels: false,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    width: info.width,
    height: info.height,
    channels: info.channels,
    bufferLength: data.length,
    sha256: sha256(data),
  };
}

export function compareDecodedPixels({
  originalDecoded,
  candidateDecoded,
  originalMetadata,
  candidateMetadata,
}) {
  const checks = {
    width: originalDecoded.width === candidateDecoded.width,
    height: originalDecoded.height === candidateDecoded.height,
    channels: originalDecoded.channels === candidateDecoded.channels,
    bufferLength:
      originalDecoded.bufferLength === candidateDecoded.bufferLength,
    rgbaSha256: originalDecoded.sha256 === candidateDecoded.sha256,
  };

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    passed: failedChecks.length === 0,
    checks,
    informational: {
      encodedChannelCountEqual:
        originalMetadata.channels === candidateMetadata.channels,
      originalEncodedChannels: originalMetadata.channels ?? null,
      candidateEncodedChannels: candidateMetadata.channels ?? null,
    },
    failedChecks,
    originalRgbaSha256: originalDecoded.sha256,
    candidateRgbaSha256: candidateDecoded.sha256,
  };
}

function normalizedFormat(extension, metadataFormat) {
  if (metadataFormat === "jpeg" || extension === ".jpg" || extension === ".jpeg") {
    return "jpg";
  }
  return metadataFormat ?? extension.replace(/^\./, "").toLowerCase();
}

export async function auditMedia(sharp) {
  const allFiles = await listFiles(sourceRoot);
  const imagePaths = allFiles.filter((filePath) =>
    imageExtensions.has(path.extname(filePath).toLowerCase()),
  );
  const videoPaths = allFiles.filter((filePath) =>
    videoExtensions.has(path.extname(filePath).toLowerCase()),
  );

  const images = [];
  for (const filePath of imagePaths) {
    const fileStats = await stat(filePath);
    const metadata = await sharp(filePath, {
      failOn: "error",
      limitInputPixels: false,
    }).metadata();
    const extension = path.extname(filePath).toLowerCase();
    const metadataSummary = summarizeMetadata(metadata);

    images.push({
      path: projectRelative(filePath),
      relativePath: sourceRelative(filePath),
      absolutePath: filePath,
      format: normalizedFormat(extension, metadata.format),
      extension,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      channels: metadata.channels ?? null,
      hasAlpha: Boolean(metadata.hasAlpha),
      colorSpace: metadata.space ?? null,
      depth: metadata.depth ?? null,
      bitDepth: metadata.bitsPerSample ?? null,
      sizeBytes: fileStats.size,
      metadata: metadataSummary,
    });
  }

  const videos = [];
  for (const filePath of videoPaths) {
    const fileStats = await stat(filePath);
    videos.push({
      path: projectRelative(filePath),
      relativePath: sourceRelative(filePath),
      extension: path.extname(filePath).toLowerCase(),
      sizeBytes: fileStats.size,
    });
  }

  const formatStats = {
    png: { count: 0, totalBytes: 0 },
    jpg: { count: 0, totalBytes: 0 },
    webp: { count: 0, totalBytes: 0 },
    gif: { count: 0, totalBytes: 0 },
    other: { count: 0, totalBytes: 0 },
  };

  for (const image of images) {
    const bucket = formatStats[image.format] ?? formatStats.other;
    bucket.count += 1;
    bucket.totalBytes += image.sizeBytes;
  }

  const imageTotalBytes = images.reduce(
    (total, image) => total + image.sizeBytes,
    0,
  );
  const videoTotalBytes = videos.reduce(
    (total, video) => total + video.sizeBytes,
    0,
  );
  const publicPortfolio = await directorySize(sourceRoot);
  const distPortfolio = await directorySize(
    path.join(projectRoot, "dist", "portfolio"),
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: projectRelative(sourceRoot),
    images,
    videos,
    largest30Images: [...images]
      .sort((left, right) => right.sizeBytes - left.sizeBytes)
      .slice(0, 30),
    totals: {
      imageCount: images.length,
      imageTotalBytes,
      videoCount: videos.length,
      videoTotalBytes,
      publicPortfolioFileCount: publicPortfolio.fileCount,
      publicPortfolioTotalBytes: publicPortfolio.totalBytes,
      distPortfolioFileCount: distPortfolio.fileCount,
      distPortfolioTotalBytes: distPortfolio.totalBytes,
      formats: formatStats,
    },
  };
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function markdownEscape(value) {
  return String(value ?? "—")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}
