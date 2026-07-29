import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopRoot = path.join(homedir(), "Desktop");
const outputRoot = path.join(projectRoot, "public", "portfolio");
const publicRoot = path.join(projectRoot, "public");
const optimizationReportPath = path.join(
  projectRoot,
  "outputs",
  "lossless-image-optimization-report.json",
);
const legacyProjectName = ["西", "佛", "寺"].join("");
const currentProjectName = "西福寺";

const chapterFolders = [
  "主视觉封面",
  "最强静帧",
  "无人机",
  "项目概览与个人职责",
  "规划与跑图路线",
  "模块化建筑与道具",
  "程序化材质与场景应用",
  "植被全流程与Billboard制作",
  "岩石苔藓PCG系统",
  "场景静帧",
  "人物完整跑图",
  "项目职责与联系方式",
  "个人简介",
  "SD节点展示",
];

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
const textExtensions = new Set([".txt", ".md"]);

function getKind(extension) {
  if (imageExtensions.has(extension)) return "image";
  if (videoExtensions.has(extension)) return "video";
  if (textExtensions.has(extension)) return "text";
  return "other";
}

function getLeadingNumber(name) {
  const match = name.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function toPublicUrl(relativePath) {
  return `/${relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function toSystemPath(projectRelativePath) {
  return path.join(projectRoot, ...projectRelativePath.split("/"));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function toVersionedUrl(filePath) {
  return stat(filePath).then((fileStats) => {
    const relativeToPublic = path.relative(publicRoot, filePath);
    const version = `${fileStats.size}-${Math.round(fileStats.mtimeMs)}`;
    return {
      src: `${toPublicUrl(relativeToPublic)}?v=${version}`,
      path: toPublicUrl(relativeToPublic),
      stats: fileStats,
    };
  });
}

async function loadOptimizationReport() {
  try {
    const report = JSON.parse(
      await readFile(optimizationReportPath, "utf8"),
    );
    return new Map(
      (report.images ?? []).map((image) => [image.originalPath, image]),
    );
  } catch (error) {
    console.warn(
      `Lossless optimization report unavailable; original images will be used (${error.message}).`,
    );
    return new Map();
  }
}

const optimizationEntries = await loadOptimizationReport();

function verifiedCandidateFor(entry, kind) {
  if (kind === "optimized-png") return entry.optimizedPng;
  if (kind === "lossless-webp") return entry.losslessWebp;
  return null;
}

async function selectImageAsset(destination, originalProjectPath) {
  const originalVersion = await toVersionedUrl(destination);
  const reportEntry = optimizationEntries.get(originalProjectPath);
  const fallback = {
    ...originalVersion,
    width: reportEntry?.width,
    height: reportEntry?.height,
    aspectRatio:
      reportEntry?.width && reportEntry?.height
        ? reportEntry.width / reportEntry.height
        : undefined,
    optimizedPath: null,
    optimizedFormat: null,
  };

  if (
    !reportEntry ||
    reportEntry.originalSizeBytes !== originalVersion.stats.size
  ) {
    return fallback;
  }

  const selection = reportEntry.smallestLosslessVersion;
  if (!selection || selection.kind === "original") return fallback;

  const candidate = verifiedCandidateFor(reportEntry, selection.kind);
  if (
    !candidate?.retained ||
    candidate.status !== "retained" ||
    candidate.validation?.passed !== true ||
    candidate.outputPath !== selection.path
  ) {
    return fallback;
  }

  try {
    const selectedPath = toSystemPath(selection.path);
    const selectedVersion = await toVersionedUrl(selectedPath);
    if (selectedVersion.stats.size !== selection.sizeBytes) return fallback;

    return {
      ...selectedVersion,
      width: reportEntry.width,
      height: reportEntry.height,
      aspectRatio: reportEntry.width / reportEntry.height,
      optimizedPath: selectedVersion.path,
      optimizedFormat: selection.format,
    };
  } catch {
    return fallback;
  }
}

async function copyIfChanged(source, destination, kind) {
  await mkdir(path.dirname(destination), { recursive: true });
  const sourceStats = await stat(source);

  if (kind === "text") {
    const sourceText = await readFile(source, "utf8");
    const websiteText = sourceText.replaceAll(
      legacyProjectName,
      currentProjectName,
    );
    let destinationText = null;

    try {
      destinationText = await readFile(destination, "utf8");
    } catch {
      destinationText = null;
    }

    if (destinationText !== websiteText) {
      await writeFile(destination, websiteText, "utf8");
    }

    return sourceStats;
  }

  let shouldCopy = true;

  try {
    const destinationStats = await stat(destination);
    shouldCopy =
      destinationStats.size !== sourceStats.size ||
      destinationStats.mtimeMs < sourceStats.mtimeMs;
  } catch {
    shouldCopy = true;
  }

  if (shouldCopy) {
    await copyFile(source, destination);
  }

  return sourceStats;
}

async function scanFolder(sourceFolder, chapterRoot, destinationChapter) {
  const entries = await readdir(sourceFolder, { withFileTypes: true });
  const folder = {
    name: path.basename(sourceFolder),
    relativePath: path.relative(chapterRoot, sourceFolder),
    sortValue: getLeadingNumber(path.basename(sourceFolder)),
    files: [],
    children: [],
  };

  for (const entry of entries) {
    const sourcePath = path.join(sourceFolder, entry.name);
    const relativeToChapter = path.relative(chapterRoot, sourcePath);

    if (entry.isDirectory()) {
      folder.children.push(
        await scanFolder(sourcePath, chapterRoot, destinationChapter),
      );
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    const kind = getKind(extension);
    if (kind === "other") continue;

    const destination = path.join(destinationChapter, relativeToChapter);
    const sourceStats = await copyIfChanged(sourcePath, destination, kind);
    const publicRelative = path.join(path.basename(chapterRoot), relativeToChapter);
    const originalProjectPath = toPosixPath(
      path.join("public", "portfolio", publicRelative),
    );
    const originalPath = toPublicUrl(
      path.join("portfolio", publicRelative),
    );
    const selected =
      kind === "image"
        ? await selectImageAsset(destination, originalProjectPath)
        : await toVersionedUrl(destination);
    const imageMetadata =
      kind === "image"
        ? {
            width: selected.width,
            height: selected.height,
            aspectRatio: selected.aspectRatio,
            alt: entry.name.replace(/\.[^.]+$/, ""),
          }
        : {};

    folder.files.push({
      name: entry.name,
      relativePath: relativeToChapter,
      url: selected.src,
      src: selected.src,
      extension:
        kind === "image" ? path.extname(selected.path).toLowerCase() : extension,
      kind,
      sortValue: getLeadingNumber(entry.name),
      sizeBytes: selected.stats.size,
      ...imageMetadata,
      originalPath,
      optimizedPath: selected.optimizedPath ?? null,
      optimizedFormat: selected.optimizedFormat ?? null,
      originalSizeBytes: sourceStats.size,
    });
  }

  return folder;
}

await mkdir(outputRoot, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  chapters: {},
  missingChapters: [],
};

for (const chapter of chapterFolders) {
  const sourceChapter = path.join(desktopRoot, chapter);
  const destinationChapter = path.join(outputRoot, chapter);

  try {
    const chapterStats = await stat(sourceChapter);
    if (!chapterStats.isDirectory()) throw new Error("not a directory");
    manifest.chapters[chapter] = await scanFolder(
      sourceChapter,
      sourceChapter,
      destinationChapter,
    );
  } catch {
    try {
      const existingStats = await stat(destinationChapter);
      if (!existingStats.isDirectory()) throw new Error("not a directory");
      manifest.chapters[chapter] = await scanFolder(
        destinationChapter,
        destinationChapter,
        destinationChapter,
      );
    } catch {
      manifest.missingChapters.push(chapter);
    }
  }
}

await writeFile(
  path.join(outputRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8",
);

const fileCount = Object.values(manifest.chapters).reduce(
  (chapterTotal, chapter) => {
    const countFolder = (folder) =>
      folder.files.length +
      folder.children.reduce((total, child) => total + countFolder(child), 0);
    return chapterTotal + countFolder(chapter);
  },
  0,
);

console.log(
  `Portfolio media ready: ${Object.keys(manifest.chapters).length} chapters, ${fileCount} files.`,
);
