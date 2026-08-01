import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectManifestMediaPaths } from "./prepare-pages-dist.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopRoot = path.join(homedir(), "Desktop");
const outputRoot = path.join(projectRoot, "public", "portfolio");
const publicRoot = path.join(projectRoot, "public");
const optimizationReportPath = path.join(
  projectRoot,
  "outputs",
  "lossless-image-optimization-report.json",
);
const q92ReportPath = path.join(
  projectRoot,
  "outputs",
  "q92-image-optimization-report.json",
);
const legacyProjectName = ["西", "佛", "寺"].join("");
const currentProjectName = "西福寺";
const activeDroneVideoName = "无人机2.mp4";
const activeDronePosterName = "无人机2-poster.webp";
const optimizedDronePosterPath = path.join(
  publicRoot,
  "portfolio-optimized-q92",
  "无人机",
  activeDronePosterName,
);

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

function compareByLeadingNumber(left, right) {
  const leftNumber = left.sortValue ?? getLeadingNumber(left.name);
  const rightNumber = right.sortValue ?? getLeadingNumber(right.name);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.name.localeCompare(right.name, "zh-CN", {
    sensitivity: "base",
  });
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

async function toVersionedUrl(filePath) {
  const [fileStats, contents] = await Promise.all([
    stat(filePath),
    readFile(filePath),
  ]);
  const relativeToPublic = path.relative(publicRoot, filePath);
  const version = createHash("sha256")
    .update(contents)
    .digest("hex")
    .slice(0, 12);
  return {
    src: `${toPublicUrl(relativeToPublic)}?v=${version}`,
    path: toPublicUrl(relativeToPublic),
    stats: fileStats,
  };
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

async function loadQ92Report() {
  try {
    const report = JSON.parse(await readFile(q92ReportPath, "utf8"));
    return new Map(
      (report.images ?? []).map((image) => [image.originalPath, image]),
    );
  } catch {
    console.warn(
      "Q92 responsive report unavailable; verified lossless images will be used.",
    );
    return new Map();
  }
}

const q92Entries = await loadQ92Report();

const committedPcgResponsiveEntries = await (async () => {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(outputRoot, "manifest.json"), "utf8"),
    );
    const entries = new Map();
    const visit = (folder) => {
      for (const file of folder.files ?? []) {
        if (
          typeof file.originalPath !== "string" ||
          !file.originalPath.includes(
            "/portfolio/%E5%B2%A9%E7%9F%B3%E8%8B%94%E8%97%93PCG%E7%B3%BB%E7%BB%9F/",
          ) ||
          ![
            "7%E8%8B%94%E8%97%93%E5%88%B6%E4%BD%9C%E6%96%B9%E5%BC%8F",
            "8%E6%9C%80%E7%BB%88%E6%95%88%E6%9E%9C%E5%B1%95%E7%A4%BA",
          ].some((segment) => file.originalPath.includes(`/${segment}/`))
        ) {
          continue;
        }
        const decodedPath = decodeURIComponent(
          file.originalPath.split("?")[0],
        ).replace(/^\//, "");
        entries.set(`public/${decodedPath}`, file);
      }
      for (const child of folder.children ?? []) visit(child);
    };
    const chapter = manifest.chapters?.["岩石苔藓PCG系统"];
    if (chapter) visit(chapter);
    return entries;
  } catch {
    return new Map();
  }
})();

async function preserveExistingOptimizedManifest() {
  const manifestPath = path.join(outputRoot, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      "Responsive optimization report is unavailable and no committed manifest can be reused.",
      { cause: error },
    );
  }

  const mediaPaths = collectManifestMediaPaths(manifest);
  const missing = [];
  for (const relativePath of mediaPaths) {
    const assetPath = path.resolve(publicRoot, ...relativePath.split("/"));
    const relative = path.relative(publicRoot, assetPath);
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`Committed manifest path escapes public: ${relativePath}`);
    }
    try {
      const assetStats = await stat(assetPath);
      if (!assetStats.isFile()) missing.push(relativePath);
    } catch {
      missing.push(relativePath);
    }
  }
  if (missing.length) {
    throw new Error(
      `Committed optimized manifest references missing public assets:\n${missing.join("\n")}`,
    );
  }
  if (
    mediaPaths.some(
      (relativePath) =>
        relativePath.startsWith("portfolio/") &&
        imageExtensions.has(path.posix.extname(relativePath).toLowerCase()),
    )
  ) {
    throw new Error(
      "Committed manifest selects original portfolio images; refusing cloud fallback.",
    );
  }

  const fileCount = Object.values(manifest.chapters ?? {}).reduce(
    (total, folder) => {
      const countFiles = (current) =>
        (current.files?.length ?? 0) +
        (current.children ?? []).reduce(
          (childTotal, child) => childTotal + countFiles(child),
          0,
        );
      return total + countFiles(folder);
    },
    0,
  );
  console.warn(
    "Q92 report unavailable; preserved and verified the committed optimized manifest.",
  );
  console.log(
    `Portfolio media ready from committed manifest: ${Object.keys(manifest.chapters ?? {}).length} chapters, ${fileCount} files, ${mediaPaths.length} referenced media assets.`,
  );
}

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

function projectPathToPublicUrl(projectPath) {
  return toPublicUrl(
    path.relative(publicRoot, toSystemPath(projectPath)),
  );
}

async function versionResponsiveVariant(variant) {
  const versioned = await toVersionedUrl(toSystemPath(variant.path));
  if (versioned.stats.size !== variant.fileSize) {
    throw new Error(`Responsive variant size changed: ${variant.path}`);
  }
  return {
    src: versioned.src,
    path: versioned.path,
    width: variant.width,
    height: variant.height,
    fileSize: variant.fileSize,
    quality: variant.quality,
    format: variant.format,
  };
}

async function selectResponsiveAsset(originalProjectPath) {
  const reportEntry = q92Entries.get(originalProjectPath);
  if (!reportEntry) {
    const committedEntry = committedPcgResponsiveEntries.get(
      originalProjectPath,
    );
    if (!committedEntry) return null;

    try {
      const versionCommittedVariant = async (variant) => {
        if (
          typeof variant?.path !== "string" ||
          !variant.path.startsWith("/portfolio-optimized-q92/") ||
          !Number.isFinite(variant.width) ||
          !Number.isFinite(variant.height)
        ) {
          throw new Error("invalid committed responsive variant");
        }
        const decodedPath = decodeURIComponent(variant.path).replace(/^\//, "");
        const versioned = await toVersionedUrl(
          path.join(publicRoot, ...decodedPath.split("/")),
        );
        if (
          Number.isFinite(variant.fileSize) &&
          versioned.stats.size !== variant.fileSize
        ) {
          throw new Error(`Responsive variant size changed: ${variant.path}`);
        }
        return {
          ...variant,
          src: versioned.src,
          path: versioned.path,
          fileSize: versioned.stats.size,
        };
      };

      const displayVariants = [];
      for (const variant of committedEntry.displayVariants ?? []) {
        displayVariants.push(await versionCommittedVariant(variant));
      }
      if (displayVariants.length === 0) return null;

      const defaultPath = committedEntry.src?.split("?")[0];
      const defaultVariant =
        displayVariants.find((variant) => variant.path === defaultPath) ??
        displayVariants[0];
      const lightboxPath = committedEntry.lightboxSrc?.split("?")[0];
      const lightboxVariant =
        displayVariants.find((variant) => variant.path === lightboxPath) ??
        await versionCommittedVariant({
          path: lightboxPath,
          width: committedEntry.lightboxWidth,
          height: committedEntry.lightboxHeight,
          fileSize: null,
          quality: committedEntry.quality,
          format: "webp",
        });

      return {
        defaultVariant,
        displayVariants,
        width: committedEntry.width,
        height: committedEntry.height,
        aspectRatio: committedEntry.aspectRatio,
        srcSet: displayVariants
          .map((variant) => `${variant.src} ${variant.width}w`)
          .join(", "),
        sizes: committedEntry.sizes,
        lightboxVariant,
        losslessPath: committedEntry.losslessPath,
        q92Path: defaultVariant.path,
        imageCategory: committedEntry.imageCategory,
        sectionId: committedEntry.sectionId,
        quality: committedEntry.quality,
      };
    } catch (error) {
      console.warn(
        `Committed PCG responsive variants unavailable for ${originalProjectPath}: ${error.message}`,
      );
      return null;
    }
  }

  try {
    const allVariants = [];
    for (const variant of reportEntry.displayVariants ?? []) {
      allVariants.push(await versionResponsiveVariant(variant));
    }
    if (allVariants.length === 0) return null;

    const lightboxVariant =
      allVariants.find(
        (variant) => variant.path === projectPathToPublicUrl(
          reportEntry.lightboxVariant.path,
        ),
      ) ?? await versionResponsiveVariant(reportEntry.lightboxVariant);
    const displayVariants = allVariants;
    const defaultVariant =
      displayVariants.find(
        (variant) => variant.path === projectPathToPublicUrl(
          reportEntry.defaultVariant.path,
        ),
      ) ?? displayVariants[0];

    return {
      defaultVariant,
      displayVariants,
      width: reportEntry.originalWidth ?? defaultVariant.width,
      height: reportEntry.originalHeight ?? defaultVariant.height,
      aspectRatio:
        (reportEntry.originalWidth ?? defaultVariant.width) /
        (reportEntry.originalHeight ?? defaultVariant.height),
      srcSet: displayVariants
        .map((variant) => `${variant.src} ${variant.width}w`)
        .join(", "),
      sizes: reportEntry.sizes,
      lightboxVariant,
      losslessPath: reportEntry.losslessPath,
      q92Path: defaultVariant.path,
      imageCategory: reportEntry.imageCategory,
      sectionId: reportEntry.sectionId,
      quality: reportEntry.quality,
    };
  } catch (error) {
    console.warn(
      `Responsive variants unavailable for ${originalProjectPath}: ${error.message}`,
    );
    return null;
  }
}

function isDisplayedAsset(kind, originalProjectPath) {
  if (
    kind === "image" &&
    originalProjectPath.includes(
      "public/portfolio/植被全流程与Billboard制作/",
    ) &&
    /\/8_.+\/3\.png$/i.test(originalProjectPath)
  ) {
    return false;
  }

  return !(
    kind === "video" &&
    originalProjectPath.includes("public/portfolio/人物完整跑图/")
  );
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
  const isDroneChapterRoot =
    sourceFolder === chapterRoot && path.basename(chapterRoot) === "无人机";

  if (
    isDroneChapterRoot &&
    !entries.some((entry) => entry.name === activeDronePosterName)
  ) {
    try {
      const localPosterStats = await stat(
        path.join(destinationChapter, activeDronePosterName),
      );
      if (localPosterStats.isFile()) {
        entries.push({
          name: activeDronePosterName,
          isDirectory: () => false,
          isFile: () => true,
        });
      }
    } catch {
      // The poster is optional until it has been generated locally.
    }
  }

  const folder = {
    name: path.basename(sourceFolder),
    relativePath: path.relative(chapterRoot, sourceFolder),
    sortValue: getLeadingNumber(path.basename(sourceFolder)),
    naturalOrder: getLeadingNumber(path.basename(sourceFolder)),
    files: [],
    children: [],
  };

  for (const entry of entries) {
    const isLocalDronePoster =
      isDroneChapterRoot && entry.name === activeDronePosterName;
    const sourcePath = isLocalDronePoster
      ? path.join(destinationChapter, entry.name)
      : path.join(sourceFolder, entry.name);
    const relativeToChapter = isLocalDronePoster
      ? entry.name
      : path.relative(chapterRoot, sourcePath);

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
    if (
      kind === "video" &&
      path.basename(chapterRoot) === "无人机" &&
      entry.name !== activeDroneVideoName
    ) {
      continue;
    }

    const destination = path.join(destinationChapter, relativeToChapter);
    const isActiveDroneVideo =
      kind === "video" &&
      isDroneChapterRoot &&
      entry.name === activeDroneVideoName;
    let sourceStats;

    if (isLocalDronePoster) {
      sourceStats = await copyIfChanged(
        sourcePath,
        optimizedDronePosterPath,
        kind,
      );    } else if (isActiveDroneVideo) {
      try {
        const existingStats = await stat(destination);
        sourceStats = existingStats.isFile()
          ? existingStats
          : await copyIfChanged(sourcePath, destination, kind);
      } catch {
        sourceStats = await copyIfChanged(sourcePath, destination, kind);
      }
    } else {
      sourceStats = await copyIfChanged(sourcePath, destination, kind);
    }

    const publicRelative = path.join(path.basename(chapterRoot), relativeToChapter);
    const originalProjectPath = toPosixPath(
      path.join("public", "portfolio", publicRelative),
    );
    const originalPath = toPublicUrl(
      path.join("portfolio", publicRelative),
    );
    const losslessSelected =
      kind === "image"
        ? isLocalDronePoster
          ? {
              ...(await toVersionedUrl(optimizedDronePosterPath)),
              width: 1600,
              height: 900,
              aspectRatio: 16 / 9,
              optimizedPath: toPublicUrl(
                path.relative(publicRoot, optimizedDronePosterPath),
              ),
              optimizedFormat: "webp",
            }
          : await selectImageAsset(destination, originalProjectPath)
        : await toVersionedUrl(destination);
    const responsiveSelected =
      kind === "image"
        ? await selectResponsiveAsset(originalProjectPath)
        : null;
    const selected =
      responsiveSelected?.defaultVariant ?? losslessSelected;
    const fallbackVariant =
      kind === "image"
        ? {
            src: losslessSelected.src,
            path: losslessSelected.path,
            width: losslessSelected.width,
            height: losslessSelected.height,
            fileSize: losslessSelected.stats.size,
            quality: null,
            format: path.extname(losslessSelected.path).replace(/^\./, ""),
          }
        : null;
    const displayVariants =
      responsiveSelected?.displayVariants ??
      (fallbackVariant ? [fallbackVariant] : []);
    const lightboxVariant =
      responsiveSelected?.lightboxVariant ?? fallbackVariant;
    const imageMetadata =
      kind === "image"
        ? {
            width: responsiveSelected?.width ?? losslessSelected.width,
            height: responsiveSelected?.height ?? losslessSelected.height,
            aspectRatio:
              responsiveSelected?.aspectRatio ?? losslessSelected.aspectRatio,
            alt: entry.name.replace(/\.[^.]+$/, ""),
            srcSet:
              responsiveSelected?.srcSet ??
              `${losslessSelected.src} ${losslessSelected.width}w`,
            sizes: responsiveSelected?.sizes ?? "100vw",
            losslessPath:
              responsiveSelected?.losslessPath ?? losslessSelected.path,
            q92Path:
              responsiveSelected?.q92Path ??
              (isLocalDronePoster ? losslessSelected.path : null),
            displayVariants,
            lightboxSrc: lightboxVariant?.src ?? selected.src,
            lightboxWidth:
              lightboxVariant?.width ?? losslessSelected.width,
            lightboxHeight:
              lightboxVariant?.height ?? losslessSelected.height,
            imageCategory: responsiveSelected?.imageCategory,
            sectionId: responsiveSelected?.sectionId,
            quality: responsiveSelected?.quality ?? null,
            fileSize: selected.stats?.size ?? selected.fileSize,
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
      naturalOrder: getLeadingNumber(entry.name),
      sizeBytes: selected.stats?.size ?? selected.fileSize,
      ...imageMetadata,
      isDisplayed: isDisplayedAsset(kind, originalProjectPath),
      originalPath,
      optimizedPath: losslessSelected.optimizedPath ?? null,
      optimizedFormat: losslessSelected.optimizedFormat ?? null,
      originalSizeBytes: sourceStats.size,
    });
  }

  folder.files.sort(compareByLeadingNumber);
  folder.children.sort(compareByLeadingNumber);

  return folder;
}

await mkdir(outputRoot, { recursive: true });

if (q92Entries.size === 0) {
  await preserveExistingOptimizedManifest();
  process.exit(0);
}

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
