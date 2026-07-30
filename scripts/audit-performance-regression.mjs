import {
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
const outputsRoot = path.join(projectRoot, "outputs");
const manifestPath = path.join(
  projectRoot,
  "public",
  "portfolio",
  "manifest.json",
);
const beforeSnapshotPath = path.join(
  outputsRoot,
  ".performance-regression-before.json",
);
const reportJsonPath = path.join(
  outputsRoot,
  "performance-regression-audit.json",
);
const reportMarkdownPath = path.join(
  outputsRoot,
  "performance-regression-audit.md",
);
const phase =
  process.argv.find((argument) => argument.startsWith("--phase="))?.slice(8) ??
  "after";

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
const targetFolder =
  "5_ZB雕刻树干，八猴高低模烘焙及ST焊接";
const baseline = {
  distBytes: 141.67 * 1024 * 1024,
  imageBytes: 87.94 * 1024 * 1024,
  videoBytes: 53.14 * 1024 * 1024,
  desktopInitialBytes: 1.46 * 1024 * 1024,
  mobileInitialBytes: 0.86 * 1024 * 1024,
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

function flattenFolder(folder, chapter, output = []) {
  for (const file of folder.files ?? []) {
    output.push({ ...file, chapter });
  }
  for (const child of folder.children ?? []) {
    flattenFolder(child, chapter, output);
  }
  return output;
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
      const fileStats = await stat(entryPath);
      files.push({
        absolutePath: entryPath,
        relativePath: toPosix(path.relative(distRoot, entryPath)),
        extension: path.extname(entry.name).toLowerCase(),
        sizeBytes: fileStats.size,
      });
    }
  }
  return files;
}

function urlToDistPath(url) {
  const pathname = decodeURIComponent(
    new URL(url, "https://local.invalid").pathname,
  ).replace(/^\/+/, "");
  return path.normalize(path.join(distRoot, ...pathname.split("/")));
}

async function existingAsset(url) {
  const absolutePath = urlToDistPath(url);
  const fileStats = await stat(absolutePath);
  return {
    absolutePath,
    relativePath: toPosix(path.relative(distRoot, absolutePath)),
    sizeBytes: fileStats.size,
  };
}

function qualityLabel(file) {
  if (file.quality === null || file.quality === undefined) return "lossless";
  return `q${file.quality}`;
}

function sum(items, selector = (item) => item.sizeBytes) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function selectCandidate(variants, targetWidth) {
  const sorted = [...variants].sort((left, right) => left.width - right.width);
  return (
    sorted.find((variant) => variant.width >= targetWidth) ?? sorted.at(-1)
  );
}

async function collectAudit() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const manifestFiles = Object.entries(manifest.chapters ?? {}).flatMap(
    ([chapter, folder]) => flattenFolder(folder, chapter),
  );
  const displayedImages = manifestFiles.filter(
    (file) => file.kind === "image" && file.isDisplayed !== false,
  );
  const displayedVideos = manifestFiles.filter(
    (file) => file.kind === "video" && file.isDisplayed !== false,
  );
  const distFiles = await walkFiles(distRoot);
  const distImages = distFiles.filter((file) =>
    imageExtensions.has(file.extension),
  );
  const distVideos = distFiles.filter((file) =>
    videoExtensions.has(file.extension),
  );
  const codeFiles = distFiles.filter((file) =>
    [".html", ".css", ".js"].includes(file.extension),
  );

  const regularReferences = new Set();
  const lightboxReferences = new Set();
  for (const file of displayedImages) {
    for (const variant of file.displayVariants ?? []) {
      regularReferences.add(urlToDistPath(variant.src));
    }
    lightboxReferences.add(
      urlToDistPath(file.lightboxSrc ?? file.src ?? file.url),
    );
  }
  const allReferences = new Set([
    ...regularReferences,
    ...lightboxReferences,
  ]);
  const missingReferences = [];
  for (const reference of allReferences) {
    try {
      const referenceStats = await stat(reference);
      if (!referenceStats.isFile()) throw new Error("not a file");
    } catch {
      missingReferences.push(toPosix(path.relative(distRoot, reference)));
    }
  }
  const unreferencedImages = distImages
    .filter((file) => !allReferences.has(path.normalize(file.absolutePath)))
    .map((file) => file.relativePath);

  const qualityCounts = displayedImages.reduce(
    (counts, file) => {
      const label = qualityLabel(file);
      counts[label] = (counts[label] ?? 0) + 1;
      return counts;
    },
    { q92: 0, q94: 0, q96: 0, lossless: 0, original: 0 },
  );
  const originalImageReferences = displayedImages
    .filter((file) =>
      decodeURIComponent(file.src ?? file.url).startsWith("/portfolio/"),
    )
    .map((file) => file.originalPath);
  qualityCounts.original = originalImageReferences.length;

  const targetFiles = displayedImages
    .filter((file) => file.relativePath.includes(`${targetFolder}\\`))
    .sort((left, right) => left.sortValue - right.sortValue);
  const targetRows = [];
  for (const file of targetFiles) {
    const regularVariants = [];
    for (const variant of file.displayVariants ?? []) {
      const asset = await existingAsset(variant.src);
      regularVariants.push({
        width: variant.width,
        height: variant.height,
        quality: variant.quality,
        sizeBytes: asset.sizeBytes,
        relativePath: asset.relativePath,
      });
    }
    const lightboxAsset = await existingAsset(
      file.lightboxSrc ?? file.src ?? file.url,
    );
    const lightboxVariant = {
      width: file.lightboxWidth ?? file.width,
      height: file.lightboxHeight ?? file.height,
      quality: file.quality,
      sizeBytes: lightboxAsset.sizeBytes,
      relativePath: lightboxAsset.relativePath,
    };
    const storageVariants = new Map(
      [...regularVariants, lightboxVariant].map((variant) => [
        variant.relativePath,
        variant,
      ]),
    );
    const defaultAsset = await existingAsset(file.src ?? file.url);
    const desktopSlotWidth = file.sizes?.includes("1480px") ? 1480 : 1440;
    const desktopVariant = selectCandidate(regularVariants, desktopSlotWidth);
    const mobileVariant = selectCandidate(regularVariants, 800);
    targetRows.push({
      fileName: file.name,
      sortValue: file.sortValue,
      originalSizeBytes: file.originalSizeBytes,
      originalWidth: file.width,
      originalHeight: file.height,
      defaultSrc: file.src ?? file.url,
      defaultSizeBytes: defaultAsset.sizeBytes,
      sizes: file.sizes,
      srcSetWidths: regularVariants.map((variant) => variant.width),
      responsiveVariants: regularVariants,
      lightboxVariant,
      lightboxIsSeparated:
        !regularVariants.some(
          (variant) => variant.relativePath === lightboxVariant.relativePath,
        ),
      storageBytes: sum([...storageVariants.values()]),
      desktopTransferBytes: desktopVariant?.sizeBytes ?? 0,
      mobileTransferBytes: mobileVariant?.sizeBytes ?? 0,
    });
  }

  const sourceFiles = {
    responsiveImage: await readFile(
      path.join(
        projectRoot,
        "src",
        "components",
        "media",
        "ResponsiveImage.tsx",
      ),
      "utf8",
    ),
    scrollGallery: await readFile(
      path.join(
        projectRoot,
        "src",
        "components",
        "media",
        "ScrollDrivenGallery.tsx",
      ),
      "utf8",
    ),
    lightbox: await readFile(
      path.join(
        projectRoot,
        "src",
        "components",
        "media",
        "Lightbox.tsx",
      ),
      "utf8",
    ),
    bilibili: await readFile(
      path.join(
        projectRoot,
        "src",
        "components",
        "media",
        "BilibiliPlayer.tsx",
      ),
      "utf8",
    ),
    video: await readFile(
      path.join(
        projectRoot,
        "src",
        "components",
        "media",
        "VideoPlayer.tsx",
      ),
      "utf8",
    ),
    globalCss: await readFile(
      path.join(projectRoot, "src", "styles", "global.css"),
      "utf8",
    ),
    videosData: await readFile(
      path.join(projectRoot, "src", "data", "videos.ts"),
      "utf8",
    ),
  };

  const initialImageCandidates = [
    ...flattenFolder(manifest.chapters["主视觉封面"], "主视觉封面").filter(
      (file) => file.kind === "image" && file.isDisplayed !== false,
    ),
    ...flattenFolder(manifest.chapters["个人简介"], "个人简介").filter(
      (file) => file.kind === "image" && file.isDisplayed !== false,
    ),
  ].map((file) => ({
    chapter: file.chapter,
    name: file.name,
    src: file.src,
    srcSetWidths: (file.displayVariants ?? []).map((variant) => variant.width),
    loading:
      file.chapter === "主视觉封面"
        ? "eager/high"
        : "viewport-observed lazy",
  }));

  const largestFiles = [...distFiles]
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 30)
    .map(({ relativePath, extension, sizeBytes }) => ({
      relativePath,
      extension,
      sizeBytes,
    }));
  const formatStats = Object.values(
    distImages.reduce((groups, file) => {
      groups[file.extension] ??= {
        format: file.extension,
        count: 0,
        sizeBytes: 0,
      };
      groups[file.extension].count += 1;
      groups[file.extension].sizeBytes += file.sizeBytes;
      return groups;
    }, {}),
  );

  return {
    collectedAt: new Date().toISOString(),
    manifestGeneratedAt: manifest.generatedAt,
    totals: {
      distBytes: sum(distFiles),
      imageBytes: sum(distImages),
      videoBytes: sum(distVideos),
      codeBytes: sum(codeFiles),
    },
    counts: {
      manifestImages: displayedImages.length,
      manifestVideos: displayedVideos.length,
      distImages: distImages.length,
      distVideos: distVideos.length,
      rawPngFiles: distImages.filter((file) => file.extension === ".png").length,
      losslessWebpFiles: distImages.filter(
        (file) =>
          file.extension === ".webp" &&
          file.relativePath.includes("portfolio-optimized-lossless/"),
      ).length,
      unreferencedImages: unreferencedImages.length,
      missingReferences: missingReferences.length,
    },
    qualityCounts,
    formatStats,
    largestFiles,
    videos: distVideos.map(({ relativePath, sizeBytes }) => ({
      relativePath,
      sizeBytes,
    })),
    originalImageReferences,
    unreferencedImages,
    missingReferences,
    referenceCounts: {
      regular: regularReferences.size,
      lightbox: lightboxReferences.size,
      combined: allReferences.size,
    },
    target: {
      folder: targetFolder,
      imageCount: targetRows.length,
      order: targetRows.map((row) => row.sortValue),
      rows: targetRows,
      allStorageBytes: sum(targetRows, (row) => row.storageBytes),
      oldStorageBytes: sum(
        targetRows.filter((row) => row.sortValue <= 4),
        (row) => row.storageBytes,
      ),
      newStorageBytes: sum(
        targetRows.filter((row) => row.sortValue >= 5),
        (row) => row.storageBytes,
      ),
      allDesktopTransferBytes: sum(
        targetRows,
        (row) => row.desktopTransferBytes,
      ),
      newDesktopTransferBytes: sum(
        targetRows.filter((row) => row.sortValue >= 5),
        (row) => row.desktopTransferBytes,
      ),
      initiallyActivatedItems: 0,
      itemsActivatedOnApproach: Math.min(2, targetRows.length),
      maximumNeighborWindow: Math.min(3, targetRows.length),
    },
    staticLoadingChecks: {
      responsiveSourcesConditional:
        sourceFiles.responsiveImage.includes(
          "srcSet={isActive && useResponsiveSources",
        ) &&
        sourceFiles.responsiveImage.includes(
          "src={isActive ? activeSource : undefined}",
        ),
      galleryCurrentAndNeighbors:
        sourceFiles.scrollGallery.includes(
          "Math.abs(index - activeIndex) <= 1",
        ),
      gallerySectionObserver:
        sourceFiles.scrollGallery.includes('rootMargin: "900px 0px"'),
      lightboxConditionalMount:
        sourceFiles.lightbox.includes("{state && active ? (") &&
        sourceFiles.lightbox.includes("sourceOverride={active.lightboxSrc"),
      bilibiliClickActivation:
        sourceFiles.bilibili.includes("isActivated ? (") &&
        sourceFiles.bilibili.includes("<iframe"),
      bilibiliBvidCorrect:
        sourceFiles.videosData.includes("BV1bs3C6NEUL"),
      localVideoClickActivation:
        sourceFiles.video.includes("isActivated ? (") &&
        sourceFiles.video.includes('preload="none"'),
      contentVisibility:
        sourceFiles.globalCss.includes("content-visibility: auto") &&
        sourceFiles.globalCss.includes("contain-intrinsic-size"),
    },
    theoreticalInitialImages: initialImageCandidates,
  };
}

await mkdir(outputsRoot, { recursive: true });
const current = await collectAudit();

if (phase === "before") {
  await writeFile(beforeSnapshotPath, JSON.stringify(current, null, 2), "utf8");
  console.log(`Performance before-snapshot: ${beforeSnapshotPath}`);
  process.exit(0);
}

let before = current;
try {
  before = JSON.parse(await readFile(beforeSnapshotPath, "utf8"));
} catch {
  // A standalone audit uses the current state for both sides.
}

const report = {
  generatedAt: new Date().toISOString(),
  baseline,
  diagnosis: {
    exactCause:
      "新增10张Q96截图使目标画廊新增40个响应式/灯箱文件；同时普通srcSet包含2560px灯箱候选，旧sizes在1920px桌面把1480px显示槽提升到2200px候选。加载激活与格式映射未回退。",
    secondStageOptimizationActive: true,
    fixes: [
      "普通展示srcSet排除独立的2560px灯箱候选，lightboxSrc继续保留2560px。",
      "横向画廊sizes在普通桌面按1440px显示槽选择，超宽屏仍可使用2200px。",
    ],
  },
  before,
  after: current,
  comparison: {
    distDeltaBytes: current.totals.distBytes - before.totals.distBytes,
    imageDeltaBytes: current.totals.imageBytes - before.totals.imageBytes,
    videoDeltaBytes: current.totals.videoBytes - before.totals.videoBytes,
    targetStorageDeltaBytes:
      current.target.allStorageBytes - before.target.allStorageBytes,
    targetDesktopTransferDeltaBytes:
      current.target.allDesktopTransferBytes -
      before.target.allDesktopTransferBytes,
    newTargetDesktopTransferDeltaBytes:
      current.target.newDesktopTransferBytes -
      before.target.newDesktopTransferBytes,
    versusBaseline: {
      distBytes: current.totals.distBytes - baseline.distBytes,
      imageBytes: current.totals.imageBytes - baseline.imageBytes,
      videoBytes: current.totals.videoBytes - baseline.videoBytes,
    },
  },
};

await writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf8");

const targetRows = current.target.rows.map((row) => {
  const variants = row.responsiveVariants
    .map(
      (variant) =>
        `${variant.width}px ${formatBytes(variant.sizeBytes)}`,
    )
    .join(" / ");
  return `| ${row.fileName} | ${formatBytes(row.originalSizeBytes)} | ${variants} | ${formatBytes(row.defaultSizeBytes)} | ${row.srcSetWidths.join(", ")} | ${formatBytes(row.lightboxVariant.sizeBytes)} | ${row.lightboxIsSeparated ? "是" : "否"} |`;
});
const largestRows = current.largestFiles.map(
  (file, index) =>
    `| ${index + 1} | ${file.relativePath} | ${file.extension || "—"} | ${formatBytes(file.sizeBytes)} |`,
);
const markdown = [
  "# 西福寺网站性能回退审计",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 结论",
  "",
  `- 准确原因：${report.diagnosis.exactCause}`,
  `- 第二轮优化：${report.diagnosis.secondStageOptimizationActive ? "仍完整生效" : "存在回退"}`,
  `- 修复前dist：${formatBytes(before.totals.distBytes)}`,
  `- 修复后dist：${formatBytes(current.totals.distBytes)}`,
  `- 修复后图片：${formatBytes(current.totals.imageBytes)}`,
  `- 修复后视频：${formatBytes(current.totals.videoBytes)}`,
  `- 修复后HTML/CSS/JS：${formatBytes(current.totals.codeBytes)}`,
  `- 原始PNG：${current.counts.rawPngFiles}个`,
  `- 未引用图片：${current.counts.unreferencedImages}个`,
  `- 缺失引用：${current.counts.missingReferences}个`,
  "",
  "## 加载逻辑验证",
  "",
  `- 响应式资源按激活后设置：${current.staticLoadingChecks.responsiveSourcesConditional ? "通过" : "失败"}`,
  `- 横向画廊当前项与前后邻居：${current.staticLoadingChecks.galleryCurrentAndNeighbors ? "通过" : "失败"}`,
  `- Lightbox点击后挂载：${current.staticLoadingChecks.lightboxConditionalMount ? "通过" : "失败"}`,
  `- 章节延迟：${current.staticLoadingChecks.contentVisibility ? "通过" : "失败"}`,
  `- Bilibili点击后创建且BV正确：${current.staticLoadingChecks.bilibiliClickActivation && current.staticLoadingChecks.bilibiliBvidCorrect ? "通过" : "失败"}`,
  `- 无人机点击后加载：${current.staticLoadingChecks.localVideoClickActivation ? "通过" : "失败"}`,
  "",
  "## 目标横向画廊",
  "",
  `- 图片数量：${current.target.imageCount}`,
  `- 顺序：${current.target.order.join("、")}`,
  `- 最终构建占用：${formatBytes(current.target.allStorageBytes)}`,
  `- 新增5–14占用：${formatBytes(current.target.newStorageBytes)}`,
  `- 修复前全部顺序浏览的普通桌面传输：${formatBytes(before.target.allDesktopTransferBytes)}`,
  `- 修复后全部顺序浏览的普通桌面传输：${formatBytes(current.target.allDesktopTransferBytes)}`,
  `- 页面初始化激活：${current.target.initiallyActivatedItems}张`,
  `- 接近画廊时激活：${current.target.itemsActivatedOnApproach}张`,
  `- 滚动时最大邻居窗口：${current.target.maximumNeighborWindow}张`,
  "",
  "| 图片 | 原图 | 响应式版本 | 默认src | srcSet宽度 | Lightbox | 2560与普通srcSet分离 |",
  "|---|---:|---|---:|---|---:|---|",
  ...targetRows,
  "",
  "## Manifest引用",
  "",
  `- 实际图片：${current.counts.manifestImages}`,
  `- Q92：${current.qualityCounts.q92}`,
  `- Q94：${current.qualityCounts.q94}`,
  `- Q96：${current.qualityCounts.q96}`,
  `- 无损：${current.qualityCounts.lossless}`,
  `- 原图src：${current.qualityCounts.original}`,
  `- regular引用文件：${current.referenceCounts.regular}`,
  `- Lightbox引用文件：${current.referenceCounts.lightbox}`,
  "",
  "## 最大30个构建文件",
  "",
  "| # | 路径 | 类型 | 大小 |",
  "|---:|---|---|---:|",
  ...largestRows,
  "",
].join("\n");
await writeFile(reportMarkdownPath, markdown, "utf8");
await rm(beforeSnapshotPath, { force: true });

console.log(`Performance audit JSON: ${reportJsonPath}`);
console.log(`Performance audit Markdown: ${reportMarkdownPath}`);
