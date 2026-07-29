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
  return `/portfolio/${relativePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
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
    const version = `${sourceStats.size}-${Math.round(sourceStats.mtimeMs)}`;

    folder.files.push({
      name: entry.name,
      relativePath: relativeToChapter,
      url: `${toPublicUrl(publicRelative)}?v=${version}`,
      extension,
      kind,
      sortValue: getLeadingNumber(entry.name),
      sizeBytes: sourceStats.size,
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
    manifest.missingChapters.push(chapter);
  }
}

if (Object.keys(manifest.chapters).length === 0) {
  try {
    const existingManifest = JSON.parse(
      await readFile(path.join(outputRoot, "manifest.json"), "utf8"),
    );
    const existingChapterCount = Object.keys(
      existingManifest.chapters ?? {},
    ).length;

    if (existingChapterCount > 0) {
      console.log(
        `Desktop media unavailable; using ${existingChapterCount} existing public chapters.`,
      );
      process.exit(0);
    }
  } catch {
    // Continue and write the missing chapter report when no fallback exists.
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
