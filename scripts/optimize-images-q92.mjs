import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  formatBytes,
  formatPercent,
  loadSharp,
  markdownEscape,
  outputsRoot,
  projectRelative,
  projectRoot,
  readJson,
  savingsPercent,
  writeJson,
} from "./media-lossless-utils.mjs";

const sharp = await loadSharp();
const publicRoot = path.join(projectRoot, "public");
const sourceRoot = path.join(publicRoot, "portfolio");
const q92Root = path.join(publicRoot, "portfolio-optimized-q92");
const manifestPath = path.join(sourceRoot, "manifest.json");
const losslessReportPath = path.join(
  outputsRoot,
  "lossless-image-optimization-report.json",
);
const reportJsonPath = path.join(
  outputsRoot,
  "q92-image-optimization-report.json",
);
const reportMarkdownPath = path.join(
  outputsRoot,
  "q92-image-optimization-report.md",
);
const onlyPrefixOption = process.argv.find((argument) =>
  argument.startsWith("--only-prefix="),
);
const onlyPrefix = onlyPrefixOption
  ? toPosix(onlyPrefixOption.slice("--only-prefix=".length)).replace(/\/+$/, "")
  : null;

if (onlyPrefix && !onlyPrefix.startsWith("public/portfolio/")) {
  throw new Error("--only-prefix must stay inside public/portfolio.");
}

const roleSettings = {
  hero: {
    widths: [768, 960, 1440, 1920],
    preferredWidth: 960,
    mobileWidth: 960,
    sizes: "100vw",
  },
  portrait: {
    widths: [480, 640, 960],
    preferredWidth: 480,
    mobileWidth: 480,
    sizes:
      "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 42vw, 390px",
  },
  full: {
    widths: [960, 1440, 1920],
    preferredWidth: 960,
    mobileWidth: 960,
    sizes:
      "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 64px), min(1700px, calc(100vw - 96px))",
  },
  horizontal: {
    widths: [800, 1200, 1440],
    preferredWidth: 800,
    mobileWidth: 800,
    sizes:
      "(max-width: 767px) 90vw, (max-width: 1199px) 82vw, min(78vw, 1480px)",
  },
  technicalHorizontal: {
    widths: [960, 1440, 1920],
    preferredWidth: 960,
    mobileWidth: 960,
    sizes:
      "(max-width: 767px) 90vw, (max-width: 1199px) 82vw, min(78vw, 1480px)",
  },
  double: {
    widths: [640, 960, 1200],
    preferredWidth: 640,
    mobileWidth: 640,
    sizes:
      "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 46vw, min(820px, 46vw)",
  },
  triple: {
    widths: [480, 640, 960],
    preferredWidth: 480,
    mobileWidth: 480,
    sizes:
      "(max-width: 767px) calc(100vw - 32px), (max-width: 1199px) 46vw, min(540px, 31vw)",
  },
};

const sectionDefinitions = [
  ["hero", "Hero主视觉"],
  ["about", "个人介绍与经历"],
  ["stills", "主要静帧"],
  ["drone", "无人机"],
  ["overview", "项目概览与个人职责"],
  ["layout", "规划与跑图路线"],
  ["modular", "模块化建筑与道具"],
  ["materials", "程序化材质与场景应用"],
  ["materials-sd", "Substance Designer节点与制作过程"],
  ["vegetation", "植被全流程制作过程展示"],
  ["pcg", "岩石苔藓PCG系统"],
  ["environment", "场景静帧"],
  ["walkthrough", "人物完整跑图"],
  ["contact", "联系方式"],
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function decodePublicPath(publicUrl) {
  return decodeURIComponent(new URL(publicUrl, "https://local.invalid").pathname);
}

function projectPathFromPublicUrl(publicUrl) {
  return `public${decodePublicPath(publicUrl)}`;
}

function absoluteFromProjectPath(projectPath) {
  return path.join(projectRoot, ...projectPath.split("/"));
}

function publicUrlFromProjectPath(projectPath) {
  const relativeToPublic = path.posix.relative("public", projectPath);
  return `/${relativeToPublic
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function flattenChapter(folder, chapterName) {
  return [
    ...(folder.files ?? []).map((file) => ({ file, chapterName })),
    ...(folder.children ?? []).flatMap((child) =>
      flattenChapter(child, chapterName),
    ),
  ];
}

function normalizedRelativePath(file) {
  return toPosix(file.relativePath);
}

function isExcludedFromPage(chapterName, file) {
  const relativePath = normalizedRelativePath(file);
  return (
    chapterName === "植被全流程与Billboard制作" &&
    /^8_.+\/3\.png$/i.test(relativePath)
  );
}

function leadingNumber(value) {
  const match = path.posix.basename(value).match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function vegetationStep(file) {
  const firstSegment = normalizedRelativePath(file).split("/")[0];
  const match = firstSegment.match(/^(\d+)_/);
  return match ? Number(match[1]) : null;
}

function classifyUsage(chapterName, file) {
  const relativePath = normalizedRelativePath(file);
  const sortValue = file.sortValue ?? leadingNumber(relativePath);

  if (chapterName === "主视觉封面") {
    return { sectionId: "hero", imageCategory: "B", displayRole: "hero" };
  }
  if (chapterName === "个人简介") {
    return {
      sectionId: "about",
      imageCategory: "D",
      displayRole: "portrait",
    };
  }
  if (chapterName === "最强静帧") {
    return {
      sectionId: "stills",
      imageCategory: "A",
      displayRole: (sortValue ?? 0) <= 3 ? "full" : "horizontal",
    };
  }
  if (chapterName === "项目概览与个人职责") {
    return {
      sectionId: "overview",
      imageCategory: "D",
      displayRole: "double",
    };
  }
  if (chapterName === "规划与跑图路线") {
    return {
      sectionId: "layout",
      imageCategory: "C",
      displayRole: "full",
    };
  }
  if (chapterName === "模块化建筑与道具") {
    return {
      sectionId: "modular",
      imageCategory: "A",
      displayRole: "horizontal",
    };
  }
  if (chapterName === "程序化材质与场景应用") {
    return {
      sectionId: "materials",
      imageCategory: "A",
      displayRole: "full",
    };
  }
  if (chapterName === "SD节点展示") {
    return {
      sectionId: "materials-sd",
      imageCategory: "C",
      displayRole: "technicalHorizontal",
    };
  }
  if (chapterName === "岩石苔藓PCG系统") {
    const imageCategory = (sortValue ?? 0) <= 6 ? "C" : "A";
    return {
      sectionId: "pcg",
      imageCategory,
      displayRole:
        imageCategory === "C" ? "technicalHorizontal" : "horizontal",
    };
  }
  if (chapterName === "场景静帧") {
    return {
      sectionId: "environment",
      imageCategory: "A",
      displayRole: "horizontal",
    };
  }
  if (chapterName === "植被全流程与Billboard制作") {
    const step = vegetationStep(file);
    if (step === null) {
      if (sortValue === 7) {
        return {
          sectionId: "vegetation",
          imageCategory: "C",
          displayRole: "triple",
        };
      }
      if ((sortValue ?? 0) <= 2) {
        return {
          sectionId: "vegetation",
          imageCategory: "A",
          displayRole: "double",
        };
      }
      return {
        sectionId: "vegetation",
        imageCategory: "A",
        displayRole: sortValue === 4 ? "full" : "horizontal",
      };
    }

    if (step === 1 || step === 2) {
      return {
        sectionId: "vegetation",
        imageCategory: "D",
        displayRole: step === 2 ? "triple" : "double",
      };
    }

    const displayRole =
      step === 5
        ? "horizontal"
        : step === 7
          ? "full"
          : step === 4
            ? "triple"
            : "double";
    return {
      sectionId: "vegetation",
      imageCategory: "C",
      displayRole,
    };
  }

  return {
    sectionId: "other",
    imageCategory: "A",
    displayRole: "full",
  };
}

function uniqueVariantWidths(sourceWidth, displayRole) {
  const displayWidths = roleSettings[displayRole].widths.filter(
    (width) => width <= sourceWidth,
  );
  if (displayWidths.length === 0) displayWidths.push(sourceWidth);
  const lightboxWidth = Math.min(2560, sourceWidth);
  return [...new Set([...displayWidths, lightboxWidth])].sort(
    (left, right) => left - right,
  );
}

function nearestVariant(variants, requestedWidth) {
  return variants.reduce((best, candidate) =>
    Math.abs(candidate.width - requestedWidth) <
    Math.abs(best.width - requestedWidth)
      ? candidate
      : best,
  );
}

function sourceSet(variants) {
  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}

function initialQuality(category) {
  return category === "C" ? 96 : 92;
}

async function removeWithRetry(filePath) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(filePath, { force: true });
      return;
    } catch (error) {
      lastError = error;
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw lastError;
}

function qualityThreshold(category) {
  if (category === "C") return { ssim: 0.995, mae: 2.6 };
  if (category === "B") return { ssim: 0.993, mae: 3.2 };
  return { ssim: 0.99, mae: 4.2 };
}

function computeGlobalSsim(reference, candidate) {
  const pixelCount = reference.length / 4;
  let referenceMean = 0;
  let candidateMean = 0;

  for (let offset = 0; offset < reference.length; offset += 4) {
    referenceMean +=
      reference[offset] * 0.2126 +
      reference[offset + 1] * 0.7152 +
      reference[offset + 2] * 0.0722;
    candidateMean +=
      candidate[offset] * 0.2126 +
      candidate[offset + 1] * 0.7152 +
      candidate[offset + 2] * 0.0722;
  }
  referenceMean /= pixelCount;
  candidateMean /= pixelCount;

  let referenceVariance = 0;
  let candidateVariance = 0;
  let covariance = 0;
  for (let offset = 0; offset < reference.length; offset += 4) {
    const referenceLuma =
      reference[offset] * 0.2126 +
      reference[offset + 1] * 0.7152 +
      reference[offset + 2] * 0.0722;
    const candidateLuma =
      candidate[offset] * 0.2126 +
      candidate[offset + 1] * 0.7152 +
      candidate[offset + 2] * 0.0722;
    const referenceDelta = referenceLuma - referenceMean;
    const candidateDelta = candidateLuma - candidateMean;
    referenceVariance += referenceDelta * referenceDelta;
    candidateVariance += candidateDelta * candidateDelta;
    covariance += referenceDelta * candidateDelta;
  }

  const divisor = Math.max(1, pixelCount - 1);
  referenceVariance /= divisor;
  candidateVariance /= divisor;
  covariance /= divisor;
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;

  return (
    ((2 * referenceMean * candidateMean + c1) * (2 * covariance + c2)) /
    ((referenceMean ** 2 + candidateMean ** 2 + c1) *
      (referenceVariance + candidateVariance + c2))
  );
}

async function qualityMetrics(source, candidate, outputWidth) {
  const metricWidth = Math.min(1024, outputWidth);
  const encoded = await sharp(candidate, {
    failOn: "error",
    limitInputPixels: false,
  })
    .resize({ width: metricWidth, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const reference = await sharp(source, {
    failOn: "error",
    limitInputPixels: false,
  })
    .autoOrient()
    .resize({
      width: encoded.info.width,
      height: encoded.info.height,
      fit: "fill",
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    reference.info.width !== encoded.info.width ||
    reference.info.height !== encoded.info.height ||
    reference.data.length !== encoded.data.length
  ) {
    throw new Error("Metric comparison dimensions do not match.");
  }

  let absoluteError = 0;
  let maximumError = 0;
  let alphaError = 0;
  let maximumAlphaError = 0;
  const pixelCount = reference.data.length / 4;

  for (let offset = 0; offset < reference.data.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const difference = Math.abs(
        reference.data[offset + channel] - encoded.data[offset + channel],
      );
      absoluteError += difference;
      maximumError = Math.max(maximumError, difference);
    }
    const alphaDifference = Math.abs(
      reference.data[offset + 3] - encoded.data[offset + 3],
    );
    alphaError += alphaDifference;
    maximumAlphaError = Math.max(maximumAlphaError, alphaDifference);
  }

  return {
    metricWidth: reference.info.width,
    metricHeight: reference.info.height,
    meanAbsolutePixelError: absoluteError / (pixelCount * 3),
    maximumPixelError: maximumError,
    meanAbsoluteAlphaError: alphaError / pixelCount,
    maximumAlphaError,
    ssim: computeGlobalSsim(reference.data, encoded.data),
  };
}

async function encodeVariant({
  source,
  relativePath,
  width,
  quality,
  hasIcc,
}) {
  const extension = path.posix.extname(relativePath);
  const basename = path.posix.basename(relativePath);
  const relativeDirectory = path.posix.dirname(relativePath);
  const outputName = `${basename}.w${width}.q${quality}.webp`;
  const output = path.join(
    q92Root,
    ...relativeDirectory.split("/").filter((part) => part !== "."),
    outputName,
  );

  await mkdir(path.dirname(output), { recursive: true });
  try {
    const existingStats = await stat(output);
    const existingMetadata = await sharp(output, {
      failOn: "error",
      limitInputPixels: false,
    }).metadata();
    if (existingStats.size > 0 && existingMetadata.width) {
      const metrics = await qualityMetrics(
        source,
        output,
        existingMetadata.width,
      );
      return {
        path: projectRelative(output),
        src: publicUrlFromProjectPath(projectRelative(output)),
        width: existingMetadata.width,
        height: existingMetadata.height,
        fileSize: existingStats.size,
        quality,
        format: "webp",
        metrics,
        sourceExtension: extension,
      };
    }
  } catch {
    await removeWithRetry(output);
  }

  let pipeline = sharp(source, {
    failOn: "error",
    limitInputPixels: false,
  })
    .autoOrient()
    .resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });

  if (hasIcc && typeof pipeline.keepIccProfile === "function") {
    pipeline = pipeline.keepIccProfile();
  }

  const result = await pipeline
    .webp({
      quality,
      alphaQuality: 100,
      effort: 6,
      lossless: false,
      nearLossless: false,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });

  await writeFile(output, result.data);
  const metrics = await qualityMetrics(source, output, result.info.width);
  return {
    path: projectRelative(output),
    src: publicUrlFromProjectPath(projectRelative(output)),
    width: result.info.width,
    height: result.info.height,
    fileSize: result.data.length,
    quality,
    format: "webp",
    metrics,
    sourceExtension: extension,
  };
}

async function encodeAtAcceptedQuality({
  source,
  relativePath,
  widths,
  category,
  hasIcc,
}) {
  const qualities =
    category === "C" ? [96] : category === "B" ? [92, 94, 96] : [92, 94, 96];
  const threshold = qualityThreshold(category);
  let selected = null;
  const attempts = [];

  for (const quality of qualities) {
    const variants = [];
    for (const width of widths) {
      variants.push(
        await encodeVariant({
          source,
          relativePath,
          width,
          quality,
          hasIcc,
        }),
      );
    }
    const accepted = variants.every(
      (variant) =>
        variant.metrics.ssim >= threshold.ssim &&
        variant.metrics.meanAbsolutePixelError <= threshold.mae &&
        variant.metrics.maximumAlphaError === 0,
    );
    attempts.push({
      quality,
      accepted,
      worstSsim: Math.min(...variants.map((variant) => variant.metrics.ssim)),
      worstMeanAbsolutePixelError: Math.max(
        ...variants.map(
          (variant) => variant.metrics.meanAbsolutePixelError,
        ),
      ),
      variants,
    });
    if (accepted || quality === 96) {
      selected = attempts.at(-1);
      break;
    }
  }

  return { selected, attempts };
}

function losslessSelectionFor(reportEntry) {
  const selected = reportEntry?.smallestLosslessVersion;
  if (!selected) return null;
  return {
    path: selected.path,
    src: publicUrlFromProjectPath(selected.path),
    width: reportEntry.width,
    height: reportEntry.height,
    fileSize: selected.sizeBytes,
    format: selected.format,
    quality: null,
  };
}

function findFirstVisible(sectionId, entries) {
  if (!entries.length) return null;
  if (sectionId === "vegetation") {
    return (
      entries.find(
        (entry) =>
          entry.file.sortValue === 4 &&
          !normalizedRelativePath(entry.file).includes("/"),
      ) ?? entries[0]
    );
  }
  return entries[0];
}

function sectionBaseline(sectionId, label, entries) {
  const images = entries.filter((entry) => entry.usage.sectionId === sectionId);
  const firstVisible = findFirstVisible(sectionId, images);
  return {
    sectionId,
    label,
    currentImageCount: images.length,
    currentImageTotalBytes: images.reduce(
      (total, entry) => total + entry.file.sizeBytes,
      0,
    ),
    currentFirstVisibleMediaPath: firstVisible?.originalProjectPath ?? null,
    currentFirstVisibleMediaBytes: firstVisible?.file.sizeBytes ?? 0,
    requestedAtInitialization: sectionId === "hero" || sectionId === "about",
    duplicateBuildFiles: false,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const losslessReport = await readJson(losslessReportPath);
const losslessByPath = new Map(
  losslessReport.images.map((image) => [image.originalPath, image]),
);
const allManifestEntries = Object.entries(manifest.chapters).flatMap(
  ([chapterName, folder]) => flattenChapter(folder, chapterName),
);
const usedEntries = allManifestEntries
  .filter(({ file }) => file.kind === "image")
  .filter(({ chapterName, file }) => !isExcludedFromPage(chapterName, file))
  .map(({ chapterName, file }) => {
    const originalProjectPath = projectPathFromPublicUrl(file.originalPath);
    return {
      chapterName,
      file,
      originalProjectPath,
      usage: classifyUsage(chapterName, file),
    };
  });
const existingReport = onlyPrefix
  ? await readJson(reportJsonPath).catch(() => null)
  : null;
const entriesToProcess = onlyPrefix
  ? usedEntries.filter((entry) =>
      entry.originalProjectPath.startsWith(`${onlyPrefix}/`),
    )
  : usedEntries;

if (onlyPrefix && entriesToProcess.length === 0) {
  throw new Error(`No displayed images matched ${onlyPrefix}`);
}

const sectionBaselines = sectionDefinitions.map(([sectionId, label]) =>
  sectionBaseline(sectionId, label, usedEntries),
);

if (
  q92Root === sourceRoot ||
  !q92Root.startsWith(`${publicRoot}${path.sep}`)
) {
  throw new Error("Unsafe Q92 output directory.");
}
await mkdir(q92Root, { recursive: true });
await mkdir(outputsRoot, { recursive: true });

const processedImages = [];
for (const [index, entry] of entriesToProcess.entries()) {
  const source = absoluteFromProjectPath(entry.originalProjectPath);
  const sourceStats = await stat(source);
  let losslessEntry = losslessByPath.get(entry.originalProjectPath);
  if (!losslessEntry) {
    const metadata = await sharp(source, {
      failOn: "error",
      limitInputPixels: false,
    }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Unable to read image dimensions: ${entry.originalProjectPath}`);
    }
    losslessEntry = {
      relativePath: toPosix(path.relative(sourceRoot, source)),
      width: metadata.width,
      height: metadata.height,
      sourceMetadata: { hasIcc: Boolean(metadata.icc) },
      smallestLosslessVersion: {
        kind: "original",
        path: entry.originalProjectPath,
        sizeBytes: sourceStats.size,
        format: path.extname(source).replace(/^\./, "").toLowerCase(),
      },
    };
  }
  const widths = uniqueVariantWidths(
    losslessEntry.width,
    entry.usage.displayRole,
  );
  const encoded = await encodeAtAcceptedQuality({
    source,
    relativePath: losslessEntry.relativePath,
    widths,
    category: entry.usage.imageCategory,
    hasIcc: Boolean(losslessEntry.sourceMetadata?.hasIcc),
  });
  const selectedVariants = encoded.selected.variants;
  const settings = roleSettings[entry.usage.displayRole];
  const lightboxVariant = nearestVariant(
    selectedVariants,
    Math.min(2560, losslessEntry.width),
  );
  const displayVariants = selectedVariants.filter((variant) =>
    settings.widths.includes(variant.width),
  );
  if (displayVariants.length === 0) {
    displayVariants.push(selectedVariants[0]);
  }
  const defaultVariant = nearestVariant(
    displayVariants,
    settings.preferredWidth,
  );
  const mobileVariant = nearestVariant(
    displayVariants,
    settings.mobileWidth,
  );
  const losslessSelection = losslessSelectionFor(losslessEntry);
  const originalSavings = savingsPercent(
    sourceStats.size,
    defaultVariant.fileSize,
  );
  const currentSavings = savingsPercent(
    entry.file.sizeBytes,
    defaultVariant.fileSize,
  );

  processedImages.push({
    originalPath: entry.originalProjectPath,
    chapter: entry.chapterName,
    sectionId: entry.usage.sectionId,
    imageCategory: entry.usage.imageCategory,
    displayRole: entry.usage.displayRole,
    originalWidth: losslessEntry.width,
    originalHeight: losslessEntry.height,
    originalSizeBytes: sourceStats.size,
    currentLosslessPath: losslessSelection.path,
    currentLosslessSizeBytes: entry.file.sizeBytes,
    requestedWidths: widths,
    quality: encoded.selected.quality,
    qualityAttempts: encoded.attempts.map((attempt) => ({
      quality: attempt.quality,
      accepted: attempt.accepted,
      worstSsim: attempt.worstSsim,
      worstMeanAbsolutePixelError:
        attempt.worstMeanAbsolutePixelError,
    })),
    displayVariants,
    src: defaultVariant.src,
    srcSet: sourceSet(displayVariants),
    sizes: settings.sizes,
    defaultVariant,
    mobileVariant,
    lightboxVariant,
    lightboxSrc: lightboxVariant.src,
    losslessPath: losslessSelection.src,
    q92Path: defaultVariant.src,
    currentSavingsPercent: currentSavings,
    originalSavingsPercent: originalSavings,
    finalSelection: `responsive-webp-q${encoded.selected.quality}`,
    fallbackReason: null,
  });

  console.log(
    `[${index + 1}/${entriesToProcess.length}] ${losslessEntry.relativePath} -> q${encoded.selected.quality}, ${displayVariants.length} display variants + lightbox`,
  );
}

const processedByOriginalPath = new Map(
  processedImages.map((image) => [image.originalPath, image]),
);
const existingByOriginalPath = new Map(
  (existingReport?.images ?? []).map((image) => [image.originalPath, image]),
);
const images = onlyPrefix
  ? usedEntries.map(
      (entry) =>
        processedByOriginalPath.get(entry.originalProjectPath) ??
        existingByOriginalPath.get(entry.originalProjectPath),
    )
  : processedImages;

if (images.some((image) => !image)) {
  throw new Error(
    "Incremental report merge is missing an existing image entry; run the full optimizer once.",
  );
}

const imageByOriginalPath = new Map(
  images.map((image) => [image.originalPath, image]),
);
const sectionResults = sectionBaselines.map((baseline) => {
  const sectionImages = images.filter(
    (image) => image.sectionId === baseline.sectionId,
  );
  const optimizedDisplayTotalBytes = sectionImages.reduce(
    (total, image) => total + image.defaultVariant.fileSize,
    0,
  );
  const optimizedMobileTotalBytes = sectionImages.reduce(
    (total, image) => total + image.mobileVariant.fileSize,
    0,
  );
  return {
    ...baseline,
    optimizedDisplayTotalBytes,
    optimizedMobileTotalBytes,
    displaySavingsPercent: savingsPercent(
      baseline.currentImageTotalBytes,
      optimizedDisplayTotalBytes,
    ),
    mobileSavingsPercent: savingsPercent(
      baseline.currentImageTotalBytes,
      optimizedMobileTotalBytes,
    ),
  };
});

const allSelectedVariantPaths = new Set();
for (const image of images) {
  for (const variant of image.displayVariants) {
    allSelectedVariantPaths.add(variant.path);
  }
  allSelectedVariantPaths.add(image.lightboxVariant.path);
}
const responsiveVariantTotalBytes = [...allSelectedVariantPaths].reduce(
  (total, variantPath) => {
    const owningImage = images.find(
      (image) =>
        image.displayVariants.some(
          (variant) => variant.path === variantPath,
        ) || image.lightboxVariant.path === variantPath,
    );
    const variant =
      owningImage.displayVariants.find(
        (candidate) => candidate.path === variantPath,
      ) ?? owningImage.lightboxVariant;
    return total + variant.fileSize;
  },
  0,
);
const currentImageTotalBytes = usedEntries.reduce(
  (total, entry) => total + entry.file.sizeBytes,
  0,
);
const optimizedDisplayTotalBytes = images.reduce(
  (total, image) => total + image.defaultVariant.fileSize,
  0,
);
const optimizedMobileTotalBytes = images.reduce(
  (total, image) => total + image.mobileVariant.fileSize,
  0,
);
const qualityCounts = images.reduce(
  (counts, image) => {
    counts[`q${image.quality}`] += 1;
    return counts;
  },
  { q92: 0, q94: 0, q96: 0, lossless: 0 },
);
const upgradedImages = images.filter(
  (image) =>
    image.imageCategory !== "C" &&
    image.quality > initialQuality(image.imageCategory),
);

const report = {
  generatedAt: new Date().toISOString(),
  phase: "phase-2-high-quality-responsive-media",
  tooling: {
    sharpVersion: sharp.versions.sharp,
    format: "webp",
    qualityFloor: 92,
    effort: 6,
    nearLossless: false,
    alphaQuality: 100,
    resize: "Lanczos default, no enlargement, aspect ratio preserved",
    metricMethod:
      "RGBA comparison at up to 1024px width; mean/max pixel error plus global luminance SSIM",
  },
  sectionBaselines,
  sectionResults,
  images,
  summary: {
    currentDisplayedImageCount: usedEntries.length,
    excludedExistingImageCount:
      allManifestEntries.filter(({ file }) => file.kind === "image").length -
      usedEntries.length,
    currentImageTotalBytes,
    optimizedDisplayTotalBytes,
    optimizedMobileTotalBytes,
    responsiveVariantTotalBytes,
    displaySavingsPercent: savingsPercent(
      currentImageTotalBytes,
      optimizedDisplayTotalBytes,
    ),
    mobileSavingsPercent: savingsPercent(
      currentImageTotalBytes,
      optimizedMobileTotalBytes,
    ),
    qualityCounts,
    upgradedImageCount: upgradedImages.length,
    upgradedImages: upgradedImages.map((image) => ({
      path: image.originalPath,
      quality: image.quality,
      reason: "Automated quality threshold required a higher setting.",
    })),
    losslessFallbackCount: 0,
    losslessFallbackImages: [],
  },
};

await writeJson(reportJsonPath, report);

const markdown = [
  "# 西福寺第二阶段高质量媒体优化报告",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 汇总",
  "",
  `- 当前实际显示图片：${report.summary.currentDisplayedImageCount} 张`,
  `- 当前无损引用总大小：${formatBytes(report.summary.currentImageTotalBytes)}`,
  `- 桌面默认响应式版本总大小：${formatBytes(report.summary.optimizedDisplayTotalBytes)}（节省 ${formatPercent(report.summary.displaySavingsPercent)}）`,
  `- 手机默认响应式版本总大小：${formatBytes(report.summary.optimizedMobileTotalBytes)}（节省 ${formatPercent(report.summary.mobileSavingsPercent)}）`,
  `- 最终构建所需全部响应式与Lightbox版本：${formatBytes(report.summary.responsiveVariantTotalBytes)}`,
  `- 质量使用：Q92 ${qualityCounts.q92} 张，Q94 ${qualityCounts.q94} 张，Q96 ${qualityCounts.q96} 张，无损回退 ${qualityCounts.lossless} 张`,
  "",
  "## 章节基准与优化结果",
  "",
  "| 章节 | 图片 | 当前大小 | 桌面响应式 | 桌面节省 | 手机响应式 | 手机节省 | 初始化请求 |",
  "|---|---:|---:|---:|---:|---:|---:|---|",
  ...sectionResults.map(
    (section) =>
      `| ${markdownEscape(section.label)} | ${section.currentImageCount} | ${formatBytes(section.currentImageTotalBytes)} | ${formatBytes(section.optimizedDisplayTotalBytes)} | ${formatPercent(section.displaySavingsPercent)} | ${formatBytes(section.optimizedMobileTotalBytes)} | ${formatPercent(section.mobileSavingsPercent)} | ${section.requestedAtInitialization ? "是" : "否"} |`,
  ),
  "",
  "## 逐图质量与尺寸",
  "",
  "| 原始路径 | 章节 | 分类 | 原始尺寸 | 当前大小 | 质量 | 默认版本 | 默认大小 | 节省 | 最低SSIM | 最大平均误差 | Alpha最大误差 |",
  "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...images.map((image) => {
    const lowestSsim = Math.min(
      ...image.displayVariants.map((variant) => variant.metrics.ssim),
    );
    const maximumMae = Math.max(
      ...image.displayVariants.map(
        (variant) => variant.metrics.meanAbsolutePixelError,
      ),
    );
    const maximumAlphaError = Math.max(
      ...image.displayVariants.map(
        (variant) => variant.metrics.maximumAlphaError,
      ),
    );
    return `| ${markdownEscape(image.originalPath)} | ${markdownEscape(image.sectionId)} | ${image.imageCategory} | ${image.originalWidth}×${image.originalHeight} | ${formatBytes(image.currentLosslessSizeBytes)} | ${image.quality} | ${image.defaultVariant.width}×${image.defaultVariant.height} | ${formatBytes(image.defaultVariant.fileSize)} | ${formatPercent(image.currentSavingsPercent)} | ${lowestSsim.toFixed(6)} | ${maximumMae.toFixed(4)} | ${maximumAlphaError} |`;
  }),
  "",
  "## 说明",
  "",
  "- 所有候选均保留原始比例，禁止放大，没有裁切、锐化或降噪。",
  "- 技术截图、节点图、软件界面和流程图使用Q96；其他图片从Q92起步并通过阈值自动升级。",
  "- Alpha使用100质量，报告逐尺寸记录透明通道误差。",
  "- Lightbox只使用不超过2560px的最大版本，并仅在点击后请求。",
  "",
].join("\n");

await writeFile(reportMarkdownPath, markdown, "utf8");
console.log(`Q92 report: ${reportJsonPath}`);
console.log(`Markdown report: ${reportMarkdownPath}`);
