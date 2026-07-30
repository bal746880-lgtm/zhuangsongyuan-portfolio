import { gzipSync } from "node:zlib";
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
const manifestPath = path.join(distRoot, "portfolio", "manifest.json");
const q92ReportPath = path.join(
  outputsRoot,
  "q92-image-optimization-report.json",
);
const beforePath = path.join(outputsRoot, ".initial-load-before.json");
const jsonReportPath = path.join(
  outputsRoot,
  "initial-load-optimization-report.json",
);
const markdownReportPath = path.join(
  outputsRoot,
  "initial-load-optimization-report.md",
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
const desktopProfile = {
  label: "1920px / DPR 1",
  viewportWidth: 1920,
  dpr: 1,
};
const mobileProfile = {
  label: "390px / DPR 3",
  viewportWidth: 390,
  dpr: 3,
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

function percentChange(before, after) {
  if (!before) return 0;
  return ((after - before) / before) * 100;
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
      continue;
    }
    if (!entry.isFile()) continue;
    const fileStats = await stat(entryPath);
    files.push({
      absolutePath: entryPath,
      relativePath: toPosix(path.relative(distRoot, entryPath)),
      extension: path.extname(entry.name).toLowerCase(),
      sizeBytes: fileStats.size,
    });
  }
  return files;
}

function urlToDistPath(url) {
  const pathname = decodeURIComponent(
    new URL(url, "https://local.invalid").pathname,
  ).replace(/^\/+/, "");
  return path.normalize(path.join(distRoot, ...pathname.split("/")));
}

function urlWithoutVersion(url) {
  const parsed = new URL(url, "https://local.invalid");
  return decodeURIComponent(parsed.pathname);
}

function originalProjectPath(file) {
  return `public${decodeURIComponent(
    new URL(file.originalPath, "https://local.invalid").pathname,
  )}`;
}

function sum(items, selector = (item) => item.sizeBytes) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function cssSlotWidth(role, viewportWidth) {
  if (role === "hero") return viewportWidth;
  if (role === "portrait") {
    if (viewportWidth <= 767) return Math.max(1, viewportWidth - 32);
    if (viewportWidth <= 1199) return viewportWidth * 0.42;
    return 390;
  }
  if (role === "full") {
    if (viewportWidth <= 767) return Math.max(1, viewportWidth - 32);
    if (viewportWidth <= 1199) return Math.max(1, viewportWidth - 64);
    return Math.min(1700, Math.max(1, viewportWidth - 96));
  }
  if (role === "double") {
    if (viewportWidth <= 767) return Math.max(1, viewportWidth - 32);
    if (viewportWidth <= 1199) return viewportWidth * 0.46;
    return Math.min(820, viewportWidth * 0.46);
  }
  if (role === "triple") {
    if (viewportWidth <= 767) return Math.max(1, viewportWidth - 32);
    if (viewportWidth <= 1199) return viewportWidth * 0.46;
    return Math.min(540, viewportWidth * 0.31);
  }
  if (role === "horizontal" || role === "technicalHorizontal") {
    if (viewportWidth <= 767) return viewportWidth * 0.9;
    if (viewportWidth <= 1199) return viewportWidth * 0.82;
    return Math.min(1480, viewportWidth * 0.78);
  }
  return viewportWidth;
}

function selectVariant(variants, requiredWidth) {
  const sorted = [...variants].sort((left, right) => left.width - right.width);
  return (
    sorted.find((variant) => variant.width >= requiredWidth) ?? sorted.at(-1)
  );
}

async function assetFromUrl(url) {
  const absolutePath = urlToDistPath(url);
  const fileStats = await stat(absolutePath);
  return {
    absolutePath,
    relativePath: toPosix(path.relative(distRoot, absolutePath)),
    sizeBytes: fileStats.size,
  };
}

async function compressedAsset(file) {
  const buffer = await readFile(file.absolutePath);
  return {
    relativePath: file.relativePath,
    rawBytes: file.sizeBytes,
    transferBytes: gzipSync(buffer, { level: 9 }).length,
  };
}

function manifestRequestPath(file) {
  return `${file.chapter}/${toPosix(file.relativePath)}`;
}

async function collectAudit() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const q92Report = JSON.parse(await readFile(q92ReportPath, "utf8"));
  const roleByOriginal = new Map(
    (q92Report.images ?? []).map((image) => [
      image.originalPath,
      image.displayRole,
    ]),
  );
  const manifestFiles = Object.entries(manifest.chapters ?? {}).flatMap(
    ([chapter, folder]) => flattenFolder(folder, chapter),
  );
  const images = manifestFiles.filter(
    (file) => file.kind === "image" && file.isDisplayed !== false,
  );
  const videos = manifestFiles.filter(
    (file) => file.kind === "video" && file.isDisplayed !== false,
  );
  const distFiles = await walkFiles(distRoot);
  const distImages = distFiles.filter((file) =>
    imageExtensions.has(file.extension),
  );
  const distVideos = distFiles.filter((file) =>
    videoExtensions.has(file.extension),
  );
  const shellFiles = distFiles.filter((file) =>
    [".html", ".css", ".js"].includes(file.extension),
  );
  const shellRequests = await Promise.all(shellFiles.map(compressedAsset));
  const manifestFile = distFiles.find(
    (file) => file.relativePath === "portfolio/manifest.json",
  );
  if (!manifestFile) throw new Error("dist/portfolio/manifest.json is missing.");
  const manifestRequest = await compressedAsset(manifestFile);

  const rows = [];
  const regularReferences = new Set();
  const lightboxReferences = new Set();
  for (const file of images) {
    const role = roleByOriginal.get(originalProjectPath(file)) ?? "full";
    const variants = [];
    for (const variant of file.displayVariants ?? []) {
      const asset = await assetFromUrl(variant.src);
      regularReferences.add(path.normalize(asset.absolutePath));
      variants.push({
        src: variant.src,
        relativePath: asset.relativePath,
        width: variant.width,
        height: variant.height,
        sizeBytes: asset.sizeBytes,
        quality: variant.quality,
      });
    }
    const lightbox = await assetFromUrl(file.lightboxSrc ?? file.src ?? file.url);
    lightboxReferences.add(path.normalize(lightbox.absolutePath));
    const defaultPath = urlWithoutVersion(file.src ?? file.url);
    const defaultVariant =
      variants.find(
        (variant) => urlWithoutVersion(variant.src) === defaultPath,
      ) ?? variants[0];
    const maximumRegularWidth = Math.max(
      0,
      ...variants.map((variant) => variant.width),
    );
    const desktopRequired =
      cssSlotWidth(role, desktopProfile.viewportWidth) * desktopProfile.dpr;
    const mobileRequired =
      cssSlotWidth(role, mobileProfile.viewportWidth) * mobileProfile.dpr;
    const desktopVariant = selectVariant(variants, desktopRequired);
    const mobileVariant = selectVariant(variants, mobileRequired);
    rows.push({
      key: originalProjectPath(file),
      chapter: file.chapter,
      path: manifestRequestPath(file),
      role,
      quality: file.quality,
      sizes: file.sizes,
      displayWidths: variants.map((variant) => variant.width),
      displaySrcs: variants.map((variant) => variant.src),
      defaultWidth: defaultVariant?.width ?? null,
      defaultSrc: file.src ?? file.url,
      fallbackUsesLargest:
        variants.length > 1 && defaultVariant?.width === maximumRegularWidth,
      includes2560InDisplay: variants.some(
        (variant) => variant.width === 2560,
      ),
      lightboxSrc: file.lightboxSrc ?? file.src ?? file.url,
      lightboxWidth: file.lightboxWidth ?? file.width,
      lightboxBytes: lightbox.sizeBytes,
      lightboxIsDisplayCandidate: variants.some(
        (variant) => variant.relativePath === lightbox.relativePath,
      ),
      desktopVariant,
      mobileVariant,
    });
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

  const hero = rows.find((row) => row.chapter === "主视觉封面");
  const portrait = rows.find((row) => row.chapter === "个人简介");
  if (!hero) throw new Error("Hero image is missing from manifest.");
  const baseRequests = [...shellRequests, manifestRequest];
  const baseTransferBytes = sum(baseRequests, (request) => request.transferBytes);
  const desktopInitialRequests = [
    ...baseRequests,
    {
      relativePath: hero.desktopVariant.relativePath,
      rawBytes: hero.desktopVariant.sizeBytes,
      transferBytes: hero.desktopVariant.sizeBytes,
    },
  ];
  const mobileInitialRequests = [
    ...baseRequests,
    {
      relativePath: hero.mobileVariant.relativePath,
      rawBytes: hero.mobileVariant.sizeBytes,
      transferBytes: hero.mobileVariant.sizeBytes,
    },
  ];
  const uniqueLightboxAssets = new Map();
  for (const row of rows) {
    const key = urlWithoutVersion(row.lightboxSrc);
    uniqueLightboxAssets.set(key, {
      path: key,
      sizeBytes: row.lightboxBytes,
      requestedByNormalDisplay: row.lightboxIsDisplayCandidate,
    });
  }
  const lightboxOnlyAssets = [...uniqueLightboxAssets.values()].filter(
    (asset) => !asset.requestedByNormalDisplay,
  );

  const chapterTransfers = Object.values(
    rows.reduce((groups, row) => {
      groups[row.chapter] ??= {
        chapter: row.chapter,
        imageCount: 0,
        desktopTransferBytes: 0,
      };
      groups[row.chapter].imageCount += 1;
      groups[row.chapter].desktopTransferBytes +=
        row.desktopVariant?.sizeBytes ?? 0;
      return groups;
    }, {}),
  );
  const targetRows = rows
    .filter((row) =>
      row.path.includes(
        "5_ZB雕刻树干，八猴高低模烘焙及ST焊接/",
      ),
    )
    .sort((left, right) => {
      const leftNumber = Number.parseInt(path.basename(left.path), 10);
      const rightNumber = Number.parseInt(path.basename(right.path), 10);
      return leftNumber - rightNumber;
    });

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
      path.join(projectRoot, "src", "components", "media", "Lightbox.tsx"),
      "utf8",
    ),
    video: await readFile(
      path.join(projectRoot, "src", "components", "media", "VideoPlayer.tsx"),
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
    videosData: await readFile(
      path.join(projectRoot, "src", "data", "videos.ts"),
      "utf8",
    ),
  };

  return {
    collectedAt: new Date().toISOString(),
    profiles: {
      desktop: desktopProfile,
      mobile: mobileProfile,
    },
    totals: {
      distBytes: sum(distFiles),
      imageBytes: sum(distImages),
      videoBytes: sum(distVideos),
      shellRawBytes: sum(shellFiles),
      shellAndManifestTransferBytes: baseTransferBytes,
      normalDesktopImageTransferBytes: sum(
        rows,
        (row) => row.desktopVariant?.sizeBytes ?? 0,
      ),
      lightboxAssetBytes: sum([...uniqueLightboxAssets.values()]),
      lightboxOnlyBytes: sum(lightboxOnlyAssets),
      firstTwoScreensDesktopBytes:
        sum(desktopInitialRequests, (request) => request.transferBytes) +
        (portrait?.desktopVariant?.sizeBytes ?? 0),
      firstTwoScreensMobileBytes:
        sum(mobileInitialRequests, (request) => request.transferBytes) +
        (portrait?.mobileVariant?.sizeBytes ?? 0),
    },
    counts: {
      images: rows.length,
      distImages: distImages.length,
      videos: distVideos.length,
      rawPng: distImages.filter((file) => file.extension === ".png").length,
      displaySrcSetWith2560: rows.filter(
        (row) => row.includes2560InDisplay,
      ).length,
      fallbackUsesLargest: rows.filter((row) => row.fallbackUsesLargest).length,
      unreferencedImages: unreferencedImages.length,
      missingReferences: missingReferences.length,
      initialDesktopRequests: desktopInitialRequests.length,
      initialMobileRequests: mobileInitialRequests.length,
      lightboxOnlyAssets: lightboxOnlyAssets.length,
    },
    hero: {
      path: hero.path,
      quality: hero.quality,
      displayWidths: hero.displayWidths,
      defaultWidth: hero.defaultWidth,
      desktopSelectedWidth: hero.desktopVariant.width,
      desktopBytes: hero.desktopVariant.sizeBytes,
      mobileSelectedWidth: hero.mobileVariant.width,
      mobileBytes: hero.mobileVariant.sizeBytes,
    },
    initial: {
      desktopRequests: desktopInitialRequests,
      desktopBytes: sum(
        desktopInitialRequests,
        (request) => request.transferBytes,
      ),
      mobileRequests: mobileInitialRequests,
      mobileBytes: sum(
        mobileInitialRequests,
        (request) => request.transferBytes,
      ),
    },
    rows,
    previous2560Rows: rows
      .filter((row) => row.includes2560InDisplay)
      .map((row) => ({
        path: row.path,
        role: row.role,
        displayWidths: row.displayWidths,
        defaultWidth: row.defaultWidth,
      })),
    chapterTransfers,
    lightboxOnlyAssets,
    videos: distVideos.map((file) => ({
      path: file.relativePath,
      sizeBytes: file.sizeBytes,
    })),
    unreferencedImages,
    missingReferences,
    targetGallery: {
      imageCount: targetRows.length,
      order: targetRows.map((row) =>
        Number.parseInt(path.basename(row.path), 10),
      ),
      qualities: targetRows.map((row) => row.quality),
      maximumDisplayWidth: Math.max(
        0,
        ...targetRows.flatMap((row) => row.displayWidths),
      ),
      lightboxWidths: [...new Set(targetRows.map((row) => row.lightboxWidth))],
    },
    cache: {
      versionSamples: rows
        .flatMap((row) => [row.defaultSrc, row.lightboxSrc])
        .slice(0, 10)
        .map((url) => new URL(url, "https://local.invalid").searchParams.get("v")),
      allContentHashVersions: rows
        .flatMap((row) => [
          row.defaultSrc,
          row.lightboxSrc,
          ...row.displaySrcs,
        ])
        .every((url) =>
          /^[a-f0-9]{12}$/.test(
            new URL(url, "https://local.invalid").searchParams.get("v") ?? "",
          ),
        ),
    },
    staticChecks: {
      responsiveSourceConditional:
        sourceFiles.responsiveImage.includes(
          "src={isActive ? activeSource : undefined}",
        ) &&
        sourceFiles.responsiveImage.includes(
          "srcSet={isActive && useResponsiveSources",
        ),
      imageRootMargin:
        sourceFiles.responsiveImage.match(
          /activationMargin\s*=\s*"([^"]+)"/,
        )?.[1] ?? null,
      galleryRootMargin:
        sourceFiles.scrollGallery.match(/rootMargin:\s*"([^"]+)"/)?.[1] ??
        null,
      galleryNeighborWindow: sourceFiles.scrollGallery.includes(
        "Math.abs(index - activeIndex) <= 1",
      ),
      lightboxClickOnly:
        sourceFiles.lightbox.includes("{state && active ? (") &&
        sourceFiles.lightbox.includes("sourceOverride={active.lightboxSrc"),
      localVideoClickOnly:
        sourceFiles.video.includes("isActivated ? (") &&
        sourceFiles.video.includes('preload="none"'),
      bilibiliClickOnly:
        sourceFiles.bilibili.includes("isActivated ? (") &&
        sourceFiles.bilibili.includes("<iframe"),
      bilibiliBvidCorrect:
        sourceFiles.videosData.includes("BV1bs3C6NEUL"),
    },
  };
}

await mkdir(outputsRoot, { recursive: true });
const current = await collectAudit();

if (phase === "before") {
  await writeFile(beforePath, JSON.stringify(current, null, 2), "utf8");
  console.log(`Initial-load before snapshot: ${beforePath}`);
  process.exit(0);
}

let before = current;
try {
  before = JSON.parse(await readFile(beforePath, "utf8"));
} catch {
  // A standalone audit compares the current build with itself.
}

const beforeByKey = new Map(before.rows.map((row) => [row.key, row]));
const fallbackChanges = current.rows.filter((row) => {
  const previous = beforeByKey.get(row.key);
  return previous && previous.defaultWidth !== row.defaultWidth;
});
const qualityChanges = current.rows.filter((row) => {
  const previous = beforeByKey.get(row.key);
  return previous && previous.quality !== row.quality;
});
const removed2560 = before.rows.filter((row) => {
  const updated = current.rows.find((candidate) => candidate.key === row.key);
  return row.includes2560InDisplay && !updated?.includes2560InDisplay;
});
const report = {
  generatedAt: new Date().toISOString(),
  methodology: {
    codeAndManifestTransfer:
      "HTML/CSS/JS与manifest按gzip估算；WebP按文件原始字节计。",
    desktopProfile: desktopProfile.label,
    mobileProfile: mobileProfile.label,
    completeBrowsing:
      "按1920px、DPR 1和各布局实际CSS槽宽，为每张图片选择一个普通displayVariant。",
    limitation:
      "静态构建审计不代替真实设备网络瀑布；GitHub Pages节点距离和用户网络不由前端代码控制。",
  },
  before,
  after: current,
  comparison: {
    distDeltaBytes: current.totals.distBytes - before.totals.distBytes,
    imageDeltaBytes: current.totals.imageBytes - before.totals.imageBytes,
    desktopInitialDeltaBytes:
      current.initial.desktopBytes - before.initial.desktopBytes,
    mobileInitialDeltaBytes:
      current.initial.mobileBytes - before.initial.mobileBytes,
    normalDesktopImageDeltaBytes:
      current.totals.normalDesktopImageTransferBytes -
      before.totals.normalDesktopImageTransferBytes,
    removed2560Count: removed2560.length,
    fallbackChangedCount: fallbackChanges.length,
    qualityChangedCount: qualityChanges.length,
  },
  removed2560: removed2560.map((row) => ({
    path: row.path,
    beforeWidths: row.displayWidths,
    afterWidths:
      current.rows.find((candidate) => candidate.key === row.key)
        ?.displayWidths ?? [],
  })),
  fallbackChanges: fallbackChanges.map((row) => ({
    path: row.path,
    beforeWidth: beforeByKey.get(row.key)?.defaultWidth,
    afterWidth: row.defaultWidth,
  })),
  qualityChanges: qualityChanges.map((row) => ({
    path: row.path,
    beforeQuality: beforeByKey.get(row.key)?.quality,
    afterQuality: row.quality,
  })),
};

await writeFile(jsonReportPath, JSON.stringify(report, null, 2), "utf8");

const requestRows = current.initial.desktopRequests.map(
  (request) =>
    `| ${request.relativePath} | ${formatBytes(request.transferBytes)} |`,
);
const removedRows = report.removed2560.map(
  (row) =>
    `| ${row.path} | ${row.beforeWidths.join(", ")} | ${row.afterWidths.join(", ")} |`,
);
const chapterRows = current.chapterTransfers.map(
  (chapter) =>
    `| ${chapter.chapter} | ${chapter.imageCount} | ${formatBytes(chapter.desktopTransferBytes)} |`,
);
const markdown = [
  "# 西福寺首屏与普通浏览传输优化报告",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 总结",
  "",
  `- dist：${formatBytes(before.totals.distBytes)} → ${formatBytes(current.totals.distBytes)}`,
  `- 图片：${formatBytes(before.totals.imageBytes)} → ${formatBytes(current.totals.imageBytes)}`,
  `- 视频：${formatBytes(current.totals.videoBytes)}`,
  `- 桌面首屏（${desktopProfile.label}）：${formatBytes(before.initial.desktopBytes)} → ${formatBytes(current.initial.desktopBytes)}（${percentChange(before.initial.desktopBytes, current.initial.desktopBytes).toFixed(2)}%）`,
  `- 手机首屏（${mobileProfile.label}）：${formatBytes(before.initial.mobileBytes)} → ${formatBytes(current.initial.mobileBytes)}（${percentChange(before.initial.mobileBytes, current.initial.mobileBytes).toFixed(2)}%）`,
  `- 首屏请求数：桌面 ${current.counts.initialDesktopRequests}，手机 ${current.counts.initialMobileRequests}`,
  `- 普通srcSet移除2560px：${report.comparison.removed2560Count}张`,
  `- src回退宽度修正：${report.comparison.fallbackChangedCount}张`,
  `- 图片质量变化：${report.comparison.qualityChangedCount}张`,
  `- 普通浏览全站图片：${formatBytes(before.totals.normalDesktopImageTransferBytes)} → ${formatBytes(current.totals.normalDesktopImageTransferBytes)}`,
  `- 未点击Lightbox不请求：${formatBytes(current.totals.lightboxOnlyBytes)}`,
  `- 未点击视频不请求：${formatBytes(current.totals.videoBytes)}`,
  "",
  "## Hero与首屏",
  "",
  `- Hero质量：Q${current.hero.quality}`,
  `- 普通候选：${current.hero.displayWidths.join(", ")}px`,
  `- 默认src：${before.hero.defaultWidth}px → ${current.hero.defaultWidth}px`,
  `- 桌面实际候选：${before.hero.desktopSelectedWidth}px / ${formatBytes(before.hero.desktopBytes)} → ${current.hero.desktopSelectedWidth}px / ${formatBytes(current.hero.desktopBytes)}`,
  `- 手机实际候选：${before.hero.mobileSelectedWidth}px / ${formatBytes(before.hero.mobileBytes)} → ${current.hero.mobileSelectedWidth}px / ${formatBytes(current.hero.mobileBytes)}`,
  `- 首页前两屏：桌面 ${formatBytes(current.totals.firstTwoScreensDesktopBytes)}，手机 ${formatBytes(current.totals.firstTwoScreensMobileBytes)}`,
  "",
  "| 首屏请求 | 理论传输 |",
  "|---|---:|",
  ...requestRows,
  "",
  "## 2560px普通候选修复",
  "",
  "| 图片 | 修复前 | 修复后 |",
  "|---|---|---|",
  ...removedRows,
  "",
  "## 分章节普通浏览图片传输",
  "",
  "| 章节 | 图片 | 桌面理论传输 |",
  "|---|---:|---:|",
  ...chapterRows,
  "",
  "## 加载与完整性检查",
  "",
  `- 普通图片观察距离：${before.staticChecks.imageRootMargin} → ${current.staticChecks.imageRootMargin}`,
  `- 横向画廊观察距离：${before.staticChecks.galleryRootMargin} → ${current.staticChecks.galleryRootMargin}`,
  `- 横向画廊当前项与前后邻居：${current.staticChecks.galleryNeighborWindow ? "通过" : "失败"}`,
  `- 个人照片参与首屏：否（首屏清单只有Hero及应用外壳）`,
  `- Lightbox点击后加载：${current.staticChecks.lightboxClickOnly ? "通过" : "失败"}`,
  `- 无人机点击后加载：${current.staticChecks.localVideoClickOnly ? "通过" : "失败"}`,
  `- Bilibili点击后创建且BV正确：${current.staticChecks.bilibiliClickOnly && current.staticChecks.bilibiliBvidCorrect ? "通过" : "失败"}`,
  `- 原始PNG：${current.counts.rawPng}`,
  `- 未引用图片：${current.counts.unreferencedImages}`,
  `- 缺失资源：${current.counts.missingReferences}`,
  `- 内容哈希版本参数：${current.cache.allContentHashVersions ? "通过" : "未全部使用"}`,
  "",
  "## 边界与后续",
  "",
  "- 2560px Lightbox文件继续保留在dist，因此构建体积不等于首页下载体积。",
  "- GitHub Pages的边缘节点距离、首次连接延迟和用户网络质量无法通过前端源码消除。",
  "- 如需真实网络数据，应在部署后由用户使用浏览器Network面板检查；本轮按要求未启动服务器或浏览器自动化。",
  "",
].join("\n");

await writeFile(markdownReportPath, markdown, "utf8");
await rm(beforePath, { force: true });

console.log(`Initial-load audit JSON: ${jsonReportPath}`);
console.log(`Initial-load audit Markdown: ${markdownReportPath}`);
console.log(
  JSON.stringify(
    {
      beforeDistBytes: before.totals.distBytes,
      afterDistBytes: current.totals.distBytes,
      afterImageBytes: current.totals.imageBytes,
      afterVideoBytes: current.totals.videoBytes,
      desktopInitialBeforeBytes: before.initial.desktopBytes,
      desktopInitialAfterBytes: current.initial.desktopBytes,
      mobileInitialBeforeBytes: before.initial.mobileBytes,
      mobileInitialAfterBytes: current.initial.mobileBytes,
      initialRequestCount: current.counts.initialDesktopRequests,
      heroBefore: before.hero,
      heroAfter: current.hero,
      removed2560Count: report.comparison.removed2560Count,
      fallbackChangedCount: report.comparison.fallbackChangedCount,
      imageMarginBefore: before.staticChecks.imageRootMargin,
      imageMarginAfter: current.staticChecks.imageRootMargin,
      galleryMarginBefore: before.staticChecks.galleryRootMargin,
      galleryMarginAfter: current.staticChecks.galleryRootMargin,
      normalDesktopImagesBeforeBytes:
        before.totals.normalDesktopImageTransferBytes,
      normalDesktopImagesAfterBytes:
        current.totals.normalDesktopImageTransferBytes,
      lightboxOnlyBytes: current.totals.lightboxOnlyBytes,
      deferredVideoBytes: current.totals.videoBytes,
      qualityChangedCount: report.comparison.qualityChangedCount,
      rawPng: current.counts.rawPng,
      unreferencedImages: current.counts.unreferencedImages,
      missingReferences: current.counts.missingReferences,
      targetGallery: current.targetGallery,
      cacheUsesContentHashes: current.cache.allContentHashVersions,
      staticChecks: current.staticChecks,
    },
    null,
    2,
  ),
);
