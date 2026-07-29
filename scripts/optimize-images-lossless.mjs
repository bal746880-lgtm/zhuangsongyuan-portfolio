import {
  mkdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  auditMedia,
  compareDecodedPixels,
  decodeRgba,
  formatBytes,
  formatPercent,
  loadSharp,
  markdownEscape,
  optimizedRoot,
  outputsRoot,
  projectRelative,
  reportJsonPath,
  reportMarkdownPath,
  savingsPercent,
  shouldKeepMetadata,
  sourceRoot,
  writeJson,
} from "./media-lossless-utils.mjs";

const sharp = await loadSharp();

if (
  optimizedRoot === sourceRoot ||
  !optimizedRoot.startsWith(`${path.dirname(sourceRoot)}${path.sep}`)
) {
  throw new Error("Unsafe optimized output directory.");
}

await rm(optimizedRoot, { recursive: true, force: true });
await mkdir(optimizedRoot, { recursive: true });
await mkdir(outputsRoot, { recursive: true });

const audit = await auditMedia(sharp);
const results = [];

async function encodeCandidate({
  source,
  destination,
  format,
  originalDecoded,
  originalMetadata,
}) {
  await mkdir(path.dirname(destination), { recursive: true });
  await rm(destination, { force: true });

  try {
    let pipeline = sharp(source, {
      failOn: "error",
      limitInputPixels: false,
    });

    if (shouldKeepMetadata(originalMetadata)) {
      pipeline = pipeline.keepMetadata();
    }

    if (format === "png") {
      pipeline = pipeline.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        progressive: false,
        palette: false,
      });
    } else if (format === "webp") {
      pipeline = pipeline.webp({
        lossless: true,
        nearLossless: false,
        smartSubsample: false,
        effort: 6,
      });
    } else {
      throw new Error(`Unsupported output format: ${format}`);
    }

    const candidateBuffer = await pipeline.toBuffer();
    const candidateMetadata = await sharp(candidateBuffer, {
      failOn: "error",
      limitInputPixels: false,
    }).metadata();
    const candidateDecoded = await decodeRgba(sharp, candidateBuffer);
    const validation = compareDecodedPixels({
      originalDecoded,
      candidateDecoded,
      originalMetadata,
      candidateMetadata,
    });

    if (!validation.passed) {
      return {
        format,
        candidateSizeBytes: candidateBuffer.length,
        outputPath: null,
        retained: false,
        status: "validation-failed",
        validation,
        failureReason: `Pixel validation failed: ${validation.failedChecks.join(", ")}`,
      };
    }

    const originalStats = await stat(source);
    if (candidateBuffer.length >= originalStats.size) {
      return {
        format,
        candidateSizeBytes: candidateBuffer.length,
        outputPath: null,
        retained: false,
        status: "no-benefit",
        validation,
        failureReason: null,
      };
    }

    await writeFile(destination, candidateBuffer);
    return {
      format,
      candidateSizeBytes: candidateBuffer.length,
      outputPath: projectRelative(destination),
      retained: true,
      status: "retained",
      validation,
      failureReason: null,
    };
  } catch (error) {
    await rm(destination, { force: true });
    return {
      format,
      candidateSizeBytes: null,
      outputPath: null,
      retained: false,
      status: "encode-failed",
      validation: {
        passed: false,
        checks: {},
        failedChecks: ["encode"],
        originalRgbaSha256: originalDecoded.sha256,
        candidateRgbaSha256: null,
      },
      failureReason: error instanceof Error ? error.message : String(error),
    };
  }
}

for (const [index, image] of audit.images.entries()) {
  const source = path.join(sourceRoot, image.relativePath.split("/").join(path.sep));
  const originalMetadata = await sharp(source, {
    failOn: "error",
    limitInputPixels: false,
  }).metadata();
  const originalDecoded = await decodeRgba(sharp, source);
  const optimizedPngDestination = path.join(
    optimizedRoot,
    image.relativePath.split("/").join(path.sep),
  );
  const webpDestination = `${optimizedPngDestination}.webp`;

  const optimizedPng =
    image.format === "png"
      ? await encodeCandidate({
          source,
          destination: optimizedPngDestination,
          format: "png",
          originalDecoded,
          originalMetadata,
        })
      : {
          format: "png",
          candidateSizeBytes: null,
          outputPath: null,
          retained: false,
          status: "not-applicable",
          validation: null,
          failureReason: null,
        };

  const losslessWebp = await encodeCandidate({
    source,
    destination: webpDestination,
    format: "webp",
    originalDecoded,
    originalMetadata,
  });

  const candidates = [
    {
      kind: "original",
      format: image.format,
      sizeBytes: image.sizeBytes,
      path: image.path,
    },
  ];

  if (optimizedPng.retained) {
    candidates.push({
      kind: "optimized-png",
      format: "png",
      sizeBytes: optimizedPng.candidateSizeBytes,
      path: optimizedPng.outputPath,
    });
  }
  if (losslessWebp.retained) {
    candidates.push({
      kind: "lossless-webp",
      format: "webp",
      sizeBytes: losslessWebp.candidateSizeBytes,
      path: losslessWebp.outputPath,
    });
  }

  candidates.sort((left, right) => left.sizeBytes - right.sizeBytes);
  const smallest = candidates[0];

  results.push({
    originalPath: image.path,
    relativePath: image.relativePath,
    originalFormat: image.format,
    width: image.width,
    height: image.height,
    channels: image.channels,
    hasAlpha: image.hasAlpha,
    colorSpace: image.colorSpace,
    depth: image.depth,
    bitDepth: image.bitDepth,
    sourceMetadata: image.metadata,
    originalSizeBytes: image.sizeBytes,
    optimizedPng,
    losslessWebp,
    optimizedPngSavingsPercent: savingsPercent(
      image.sizeBytes,
      optimizedPng.candidateSizeBytes,
    ),
    losslessWebpSavingsPercent: savingsPercent(
      image.sizeBytes,
      losslessWebp.candidateSizeBytes,
    ),
    smallestLosslessVersion: smallest,
    recommendedFormat: smallest.kind,
    noOptimizationBenefit: smallest.kind === "original",
  });

  console.log(
    `[${index + 1}/${audit.images.length}] ${image.relativePath} -> ${smallest.kind} (${formatBytes(smallest.sizeBytes)})`,
  );
}

const originalImageTotalBytes = results.reduce(
  (total, image) => total + image.originalSizeBytes,
  0,
);
const optimizedPngTotalBytes = results.reduce((total, image) => {
  if (image.optimizedPng.retained) {
    return total + image.optimizedPng.candidateSizeBytes;
  }
  return total + image.originalSizeBytes;
}, 0);
const losslessWebpTotalBytes = results.reduce((total, image) => {
  if (image.losslessWebp.retained) {
    return total + image.losslessWebp.candidateSizeBytes;
  }
  return total + image.originalSizeBytes;
}, 0);
const smallestLosslessTotalBytes = results.reduce(
  (total, image) => total + image.smallestLosslessVersion.sizeBytes,
  0,
);
const pngResults = results.filter((image) => image.originalFormat === "png");
const averagePngSavingsPercent =
  pngResults.reduce((total, image) => {
    const selectedSize = image.optimizedPng.retained
      ? image.optimizedPng.candidateSizeBytes
      : image.originalSizeBytes;
    return total + savingsPercent(image.originalSizeBytes, selectedSize);
  }, 0) / Math.max(1, pngResults.length);
const averageWebpSavingsPercent =
  results.reduce((total, image) => {
    const selectedSize = image.losslessWebp.retained
      ? image.losslessWebp.candidateSizeBytes
      : image.originalSizeBytes;
    return total + savingsPercent(image.originalSizeBytes, selectedSize);
  }, 0) / Math.max(1, results.length);
const validationFailureImages = results.filter(
  (image) =>
    image.optimizedPng.status === "validation-failed" ||
    image.optimizedPng.status === "encode-failed" ||
    image.losslessWebp.status === "validation-failed" ||
    image.losslessWebp.status === "encode-failed",
);
const noBenefitImages = results.filter(
  (image) => image.noOptimizationBenefit,
);
const estimatedDistPortfolioTotalBytes = Math.max(
  0,
  audit.totals.distPortfolioTotalBytes -
    originalImageTotalBytes +
    smallestLosslessTotalBytes,
);

const resultByPath = new Map(
  results.map((image) => [image.originalPath, image]),
);
const largest30Comparison = audit.largest30Images.map((image) => {
  const result = resultByPath.get(image.path);
  return {
    path: image.path,
    originalSizeBytes: image.sizeBytes,
    optimizedPngSizeBytes: result.optimizedPng.candidateSizeBytes,
    losslessWebpSizeBytes: result.losslessWebp.candidateSizeBytes,
    smallestLosslessSizeBytes: result.smallestLosslessVersion.sizeBytes,
    recommendedFormat: result.recommendedFormat,
    totalSavingsPercent: savingsPercent(
      image.sizeBytes,
      result.smallestLosslessVersion.sizeBytes,
    ),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  phase: "phase-1-pixel-identical-lossless",
  tooling: {
    sharpVersion: sharp.versions.sharp,
    pngOptimizer: "Sharp PNG lossless re-encode fallback",
    pngOptions: {
      compressionLevel: 9,
      adaptiveFiltering: true,
      progressive: false,
      palette: false,
      resize: false,
      quantization: false,
    },
    webpOptions: {
      lossless: true,
      nearLossless: false,
      resize: false,
      colorQuantization: false,
    },
    verification:
      "Sharp decode to RGBA + width/height/channels/buffer length + SHA-256 equality",
  },
  audit,
  images: results,
  summary: {
    originalImageTotalBytes,
    optimizedPngTotalBytes,
    losslessWebpTotalBytes,
    smallestLosslessTotalBytes,
    pngTotalSavingsPercent: savingsPercent(
      originalImageTotalBytes,
      optimizedPngTotalBytes,
    ),
    webpTotalSavingsPercent: savingsPercent(
      originalImageTotalBytes,
      losslessWebpTotalBytes,
    ),
    smallestLosslessSavingsPercent: savingsPercent(
      originalImageTotalBytes,
      smallestLosslessTotalBytes,
    ),
    averagePngSavingsPercent,
    averageWebpSavingsPercent,
    noBenefitImageCount: noBenefitImages.length,
    noBenefitImages: noBenefitImages.map((image) => image.originalPath),
    validationFailureImageCount: validationFailureImages.length,
    validationFailureImages: validationFailureImages.map((image) => ({
      path: image.originalPath,
      optimizedPngStatus: image.optimizedPng.status,
      optimizedPngFailureReason: image.optimizedPng.failureReason,
      webpStatus: image.losslessWebp.status,
      webpFailureReason: image.losslessWebp.failureReason,
    })),
    currentDistPortfolioTotalBytes: audit.totals.distPortfolioTotalBytes,
    estimatedDistPortfolioTotalBytes,
    largest30Comparison,
  },
};

await writeJson(reportJsonPath, report);

const metadataLabel = (image) => {
  const labels = [];
  if (image.sourceMetadata.hasIcc) labels.push("ICC");
  if (image.sourceMetadata.hasExif) labels.push("EXIF");
  if (image.sourceMetadata.hasXmp) labels.push("XMP");
  if (image.sourceMetadata.hasIptc) labels.push("IPTC");
  if (image.sourceMetadata.hasOtherMetadata) labels.push("其他");
  return labels.length ? labels.join("、") : "无";
};
const validationLabel = (candidate) => {
  if (!candidate.validation) return "不适用";
  return candidate.validation.passed ? "通过" : "失败";
};

const markdown = [
  "# 西福寺作品集：像素级无损图片优化报告",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 汇总结论",
  "",
  "| 指标 | 结果 |",
  "|---|---:|",
  `| 原始图片总大小 | ${formatBytes(originalImageTotalBytes)} |`,
  `| PNG无损优化场景总大小 | ${formatBytes(optimizedPngTotalBytes)} |`,
  `| 无损WebP场景总大小 | ${formatBytes(losslessWebpTotalBytes)} |`,
  `| 逐张选择最小无损版本 | ${formatBytes(smallestLosslessTotalBytes)} |`,
  `| PNG总节省比例 | ${formatPercent(report.summary.pngTotalSavingsPercent)} |`,
  `| 无损WebP总节省比例 | ${formatPercent(report.summary.webpTotalSavingsPercent)} |`,
  `| 最小无损组合总节省比例 | ${formatPercent(report.summary.smallestLosslessSavingsPercent)} |`,
  `| PNG平均节省比例 | ${formatPercent(averagePngSavingsPercent)} |`,
  `| 无损WebP平均节省比例 | ${formatPercent(averageWebpSavingsPercent)} |`,
  `| 无收益图片数量 | ${noBenefitImages.length} |`,
  `| 验证失败图片数量 | ${validationFailureImages.length} |`,
  `| 当前 dist/portfolio | ${formatBytes(audit.totals.distPortfolioTotalBytes)} |`,
  `| 预计采用最小无损版本后的 dist/portfolio | ${formatBytes(estimatedDistPortfolioTotalBytes)} |`,
  "",
  "## 媒体审计汇总",
  "",
  "| 类型 | 数量 | 总大小 |",
  "|---|---:|---:|",
  `| PNG | ${audit.totals.formats.png.count} | ${formatBytes(audit.totals.formats.png.totalBytes)} |`,
  `| JPG/JPEG | ${audit.totals.formats.jpg.count} | ${formatBytes(audit.totals.formats.jpg.totalBytes)} |`,
  `| 图片合计 | ${audit.totals.imageCount} | ${formatBytes(audit.totals.imageTotalBytes)} |`,
  `| 视频合计 | ${audit.totals.videoCount} | ${formatBytes(audit.totals.videoTotalBytes)} |`,
  `| public/portfolio | ${audit.totals.publicPortfolioFileCount} 个文件 | ${formatBytes(audit.totals.publicPortfolioTotalBytes)} |`,
  `| dist/portfolio | ${audit.totals.distPortfolioFileCount} 个文件 | ${formatBytes(audit.totals.distPortfolioTotalBytes)} |`,
  "",
  "## 最大30张图片优化前后",
  "",
  "| 原始路径 | 原始 | 优化PNG | 无损WebP | 最小无损版本 | 推荐 | 节省 |",
  "|---|---:|---:|---:|---:|---|---:|",
  ...largest30Comparison.map(
    (image) =>
      `| ${markdownEscape(image.path)} | ${formatBytes(image.originalSizeBytes)} | ${formatBytes(image.optimizedPngSizeBytes)} | ${formatBytes(image.losslessWebpSizeBytes)} | ${formatBytes(image.smallestLosslessSizeBytes)} | ${image.recommendedFormat} | ${formatPercent(image.totalSavingsPercent)} |`,
  ),
  "",
  "## 逐图审计与验证",
  "",
  "| 原始路径 | 格式 | 尺寸 | 通道 | Alpha | 色彩空间 | 位深 | 元数据 | 原始 | 优化PNG | PNG验证 | 无损WebP | WebP验证 | 最小版本 | 无收益 |",
  "|---|---|---:|---:|---|---|---:|---|---:|---:|---|---:|---|---|---|",
  ...results.map(
    (image) =>
      `| ${markdownEscape(image.originalPath)} | ${image.originalFormat.toUpperCase()} | ${image.width}×${image.height} | ${image.channels} | ${image.hasAlpha ? "是" : "否"} | ${markdownEscape(image.colorSpace)} | ${image.bitDepth ?? image.depth ?? "—"} | ${metadataLabel(image)} | ${formatBytes(image.originalSizeBytes)} | ${formatBytes(image.optimizedPng.candidateSizeBytes)} | ${validationLabel(image.optimizedPng)} | ${formatBytes(image.losslessWebp.candidateSizeBytes)} | ${validationLabel(image.losslessWebp)} | ${image.recommendedFormat} | ${image.noOptimizationBenefit ? "是" : "否"} |`,
  ),
  "",
  "## 无优化收益图片",
  "",
  ...(noBenefitImages.length
    ? noBenefitImages.map((image) => `- ${image.originalPath}`)
    : ["- 无"]),
  "",
  "## 验证失败",
  "",
  ...(validationFailureImages.length
    ? validationFailureImages.map(
        (image) =>
          `- ${image.originalPath}：PNG ${image.optimizedPng.status}；WebP ${image.losslessWebp.status}`,
      )
    : ["- 无。所有保留候选均通过RGBA逐字节SHA-256验证。"]),
  "",
  "## 说明",
  "",
  "- 未修改或覆盖 public/portfolio 中的任何原始图片。",
  "- 优化PNG仅在像素验证通过且文件更小时保留。",
  "- 无损WebP仅在像素验证通过且文件更小时保留。",
  "- 本报告没有修改manifest、React组件或任何图片引用。",
  "",
].join("\n");

await writeFile(reportMarkdownPath, markdown, "utf8");

console.log(`Original images: ${formatBytes(originalImageTotalBytes)}`);
console.log(`PNG scenario: ${formatBytes(optimizedPngTotalBytes)}`);
console.log(`WebP scenario: ${formatBytes(losslessWebpTotalBytes)}`);
console.log(`Smallest lossless set: ${formatBytes(smallestLosslessTotalBytes)}`);
console.log(`Validation failures: ${validationFailureImages.length}`);
console.log(`JSON report: ${reportJsonPath}`);
console.log(`Markdown report: ${reportMarkdownPath}`);
