import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(projectRoot, "outputs");
const primaryPdfPath = path.join(
  outputDirectory,
  "庄松源_西福寺_作品集.pdf",
);
const emailPdfPath = path.join(
  outputDirectory,
  "庄松源_西福寺_作品集_邮件版.pdf",
);
const emailCandidateDirectory = path.join(
  projectRoot,
  "tmp",
  "pdfs",
  "email-high-quality",
);
const viteCli = path.join(
  projectRoot,
  "node_modules",
  "vite",
  "bin",
  "vite.js",
);
const previewUrl = "http://127.0.0.1:4176/";
const mebibyte = 1024 * 1024;
const emailAcceptableMinimumBytes = 85 * mebibyte;
const emailPreferredMinimumBytes = 92 * mebibyte;
const emailPreferredMaximumBytes = 98 * mebibyte;
const emailMaximumBytes = 100 * mebibyte;
const emailTargetBytes = 95 * mebibyte;
const emailHighQualityOnly = process.argv.includes(
  "--email-high-quality",
);
const skipBuild = process.argv.includes("--skip-build");
const expectedVegetationTitle =
  "ZB雕刻树干，八猴高低模烘焙及Speedtree制作";
const forbiddenVegetationTitles = [
  "ZB雕刻树干，八猴高低模烘焙及ST焊接",
  "ZBrush 雕刻树干八猴烘焙高低模与Speedtree焊接制作",
];
const expectedSectionTitles = [
  "个人介绍与经历",
  "主要静帧",
  "项目概览与个人职责",
  "规划与跑图路线",
  "模块化建筑与道具",
  "程序化材质与场景应用",
  "Substance Designer 节点与制作过程",
  "植被资产陈列",
  "植被全流程制作过程展示",
  "岩石苔藓 PCG 系统",
  "场景静帧",
  "项目职责与联系方式",
];
const excludedPdfChapterNames = new Set([
  "无人机",
  "人物完整跑图",
  "项目职责与联系方式",
]);
const manifestPath = path.join(
  projectRoot,
  "public",
  "portfolio",
  "manifest.json",
);
const emailMaxWidths = {
  hero: 2560,
  scene: 2400,
  asset: 2200,
  portrait: 1800,
  technical: 2560,
};
const emailProfiles = {
  high: {
    name: "high",
    hero: 97,
    scene: 96,
    asset: 96,
    portrait: 96,
    technical: 98,
    maxWidths: emailMaxWidths,
  },
  balanced: {
    name: "balanced",
    hero: 97,
    scene: 95,
    asset: 95,
    portrait: 96,
    technical: 98,
    maxWidths: emailMaxWidths,
  },
  safe: {
    name: "safe",
    hero: 95,
    scene: 93,
    asset: 94,
    portrait: 95,
    technical: 97,
    maxWidths: emailMaxWidths,
  },
  ultra: {
    name: "ultra",
    hero: 98,
    scene: 98,
    asset: 97,
    portrait: 98,
    technical: 98,
    maxWidths: emailMaxWidths,
  },
  hybridStills: {
    name: "hybrid-stills",
    hero: 98,
    scene: 98,
    asset: 97,
    portrait: 98,
    technical: 98,
    maxWidths: emailMaxWidths,
    retainSourceLimits: {
      stills: 6,
    },
  },
  hybridCoreStills: {
    name: "hybrid-core-stills",
    hero: 98,
    scene: 98,
    asset: 97,
    portrait: 98,
    technical: 98,
    maxWidths: emailMaxWidths,
    retainSourceLimits: {
      stills: 3,
    },
  },
};
const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function firstExistingPath(paths) {
  for (const candidate of paths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through the explicit candidate list.
    }
  }
  return null;
}

function imagesInFolder(folder) {
  return (folder?.files ?? [])
    .filter(
      (file) =>
        file.kind === "image" && file.isDisplayed !== false,
    )
    .sort((left, right) => {
      const leftNumber =
        left.sortValue ??
        Number(left.name.match(/^(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
      const rightNumber =
        right.sortValue ??
        Number(right.name.match(/^(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
      return (
        leftNumber - rightNumber ||
        left.name.localeCompare(right.name, "zh-CN", {
          numeric: true,
        })
      );
    });
}

function collectFolderImages(folder) {
  return [
    ...imagesInFolder(folder),
    ...(folder?.children ?? []).flatMap(collectFolderImages),
  ];
}

async function loadPdfExpectations() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const chapters = Object.entries(manifest.chapters ?? {});
  const websiteImages = chapters.flatMap(([, folder]) =>
    collectFolderImages(folder),
  );
  const pdfImages = chapters
    .filter(([chapterName]) => !excludedPdfChapterNames.has(chapterName))
    .flatMap(([, folder]) => collectFolderImages(folder));
  const vegetationChapter = chapters
    .map(([, folder]) => folder)
    .find((folder) => folder.name?.includes("Billboard"));
  const stepFiveFolder = vegetationChapter?.children?.find(
    (folder) => folder.sortValue === 5,
  );
  const stepFiveImages = imagesInFolder(stepFiveFolder);
  const expectedStepOrder = Array.from(
    { length: 14 },
    (_, index) => index + 1,
  );
  const actualStepOrder = stepFiveImages.map(
    (file) =>
      file.sortValue ??
      Number(file.name.match(/^(\d+)/)?.[1] ?? -1),
  );

  if (
    actualStepOrder.length !== expectedStepOrder.length ||
    actualStepOrder.some(
      (value, index) => value !== expectedStepOrder[index],
    )
  ) {
    throw new Error(
      `The current manifest does not contain ZB step images 1-14 in order: ${actualStepOrder.join(", ")}`,
    );
  }

  return {
    generatedAt: manifest.generatedAt ?? null,
    websiteImageCount: websiteImages.length,
    pdfImageCount: pdfImages.length,
    expectedSectionTitles,
    expectedVegetationTitle,
    forbiddenVegetationTitles,
    stepFiveFolderName: stepFiveFolder.name,
    stepFiveOrder: expectedStepOrder,
  };
}

async function runBuild() {
  const npmCommand =
    process.platform === "win32"
      ? process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe"
      : "npm";
  const npmArguments =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd run build"]
      : ["run", "build"];
  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, npmArguments, {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run build exited with code ${code}.`));
      }
    });
  });
}

function startPreview() {
  const child = spawn(
    process.execPath,
    [
      viteCli,
      "preview",
      "--configLoader",
      "runner",
      "--host",
      "127.0.0.1",
      "--port",
      "4176",
      "--strictPort",
    ],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  return child;
}

async function waitForPreview(child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Temporary Vite preview exited with code ${child.exitCode}.`,
      );
    }

    try {
      const response = await fetch(previewUrl, {
        signal: AbortSignal.timeout(1_500),
      });
      if (response.ok) return;
    } catch {
      // The bounded retry loop handles startup latency.
    }

    await delay(250);
  }

  throw new Error("Temporary Vite preview did not start within 20 seconds.");
}

async function stopPreview(child) {
  if (!child || child.exitCode !== null) return;

  child.kill();
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    delay(3_000).then(() => false),
  ]);

  if (!exited && child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(2_000),
    ]);
  }
}

async function waitForPdfView(page, expectations) {
  await page.waitForFunction(
    () =>
      window.__PORTFOLIO_PDF_READY__ === true ||
      (window.__PORTFOLIO_PDF_ERRORS__?.length ?? 0) > 0,
    { timeout: 180_000 },
  );

  const status = await page.evaluate(async (expected) => {
    await document.fonts.ready;
    const images = Array.from(document.querySelectorAll("img"));
    const visibleText =
      document.querySelector(".portfolio-pdf")?.textContent ?? "";
    const sectionTitles = Array.from(
      document.querySelectorAll(".pdf-section-header h2"),
      (heading) => heading.textContent?.trim() ?? "",
    );
    const stepFiveCards = Array.from(
      document.querySelectorAll(
        '.pdf-process-step[data-pdf-step="5"] .pdf-media-card',
      ),
    );
    const stepFiveOrder = stepFiveCards.map((card) =>
      Number(card.getAttribute("data-sort-value")),
    );
    const failedImages = images
      .filter((image) => !image.complete || !image.naturalWidth)
      .map(
        (image) =>
          image.dataset.pdfSource ??
          image.currentSrc ??
          image.src,
      );

    return {
      ready: window.__PORTFOLIO_PDF_READY__ === true,
      errors: [
        ...new Set([
          ...(window.__PORTFOLIO_PDF_ERRORS__ ?? []),
          ...failedImages,
        ]),
      ],
      imageCount: images.length,
      videoCount: document.querySelectorAll("video").length,
      iframeCount: document.querySelectorAll("iframe").length,
      navigationCount: document.querySelectorAll("nav, .navigation").length,
      buttonCount: document.querySelectorAll("button").length,
      fontStatus: document.fonts.status,
      sectionTitles,
      stepFiveOrder,
      hasExpectedVegetationTitle: visibleText.includes(
        expected.expectedVegetationTitle,
      ),
      forbiddenVegetationTitles: expected.forbiddenVegetationTitles.filter(
        (title) => visibleText.includes(title),
      ),
      bvids: visibleText.match(/BV[0-9A-Za-z]{10}/g) ?? [],
      variant:
        document.querySelector(".portfolio-pdf")?.getAttribute(
          "data-pdf-variant",
        ) ?? "unknown",
    };
  }, expectations);

  if (!status.ready || status.errors.length) {
    throw new Error(
      `PDF view contains failed images:\n${status.errors.join("\n")}`,
    );
  }
  if (status.imageCount < 1) {
    throw new Error("PDF view did not render any images.");
  }
  if (status.imageCount !== expectations.pdfImageCount) {
    throw new Error(
      `PDF image count mismatch: expected ${expectations.pdfImageCount}, rendered ${status.imageCount}.`,
    );
  }
  if (
    JSON.stringify(status.sectionTitles) !==
    JSON.stringify(expectations.expectedSectionTitles)
  ) {
    throw new Error(
      `PDF section order mismatch:\n${status.sectionTitles.join("\n")}`,
    );
  }
  if (!status.hasExpectedVegetationTitle) {
    throw new Error(
      `The current vegetation title is missing: ${expectations.expectedVegetationTitle}`,
    );
  }
  if (status.forbiddenVegetationTitles.length) {
    throw new Error(
      `Outdated vegetation titles remain in the PDF view: ${status.forbiddenVegetationTitles.join(", ")}`,
    );
  }
  if (
    JSON.stringify(status.stepFiveOrder) !==
    JSON.stringify(expectations.stepFiveOrder)
  ) {
    throw new Error(
      `ZB step image order mismatch: ${status.stepFiveOrder.join(", ")}`,
    );
  }
  if (status.bvids.length) {
    throw new Error(
      `The PDF view contains Bilibili identifiers: ${status.bvids.join(", ")}`,
    );
  }
  if (
    status.videoCount ||
    status.iframeCount ||
    status.navigationCount ||
    status.buttonCount
  ) {
    throw new Error(
      `PDF view contains forbidden interactive media: ${JSON.stringify(
        status,
      )}`,
    );
  }

  return status;
}

async function prepareEmailImages(page, profile) {
  return page.evaluate(async (qualityProfile) => {
    const images = Array.from(
      document.querySelectorAll(".portfolio-pdf img"),
    );
    let encodedBytes = 0;
    const records = [];
    const retainedBySection = {};
    const sceneSections = new Set([
      "stills",
      "vegetation",
      "pcg",
      "environment-stills",
    ]);
    const assetSections = new Set([
      "layout",
      "modular",
      "materials",
      "overview",
    ]);

    for (const image of images) {
      const category = image.dataset.imageCategory ?? "A";
      const sectionId = image.dataset.sectionId ?? "unknown";
      let contentType = "asset";
      let quality = qualityProfile.asset;

      if (sectionId === "hero") {
        contentType = "hero";
        quality = qualityProfile.hero;
      } else if (category === "C") {
        contentType = "technical";
        quality = qualityProfile.technical;
      } else if (category === "D") {
        contentType = "portrait";
        quality = qualityProfile.portrait;
      } else if (sceneSections.has(sectionId)) {
        contentType = "scene";
        quality = qualityProfile.scene;
      } else if (assetSections.has(sectionId)) {
        contentType = "asset";
        quality = qualityProfile.asset;
      }

      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const maximumWidth =
        qualityProfile.maxWidths?.[contentType] ?? sourceWidth;
      const width = Math.min(sourceWidth, maximumWidth);
      const height = Math.max(
        1,
        Math.round((sourceHeight * width) / sourceWidth),
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", {
        alpha: true,
        colorSpace: "srgb",
        willReadFrequently: true,
      });
      if (!context) {
        throw new Error("Unable to create the email PDF image canvas.");
      }

      context.drawImage(image, 0, 0, width, height);

      const pixels = context.getImageData(
        0,
        0,
        width,
        height,
      ).data;
      let hasAlpha = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] !== 255) {
          hasAlpha = true;
          break;
        }
      }

      const retainLimit =
        qualityProfile.retainSourceLimits?.[sectionId] ?? 0;
      const retainedCount = retainedBySection[sectionId] ?? 0;
      if (retainedCount < retainLimit) {
        retainedBySection[sectionId] = retainedCount + 1;
        records.push({
          originalPath: image.dataset.originalPath ?? "",
          sectionId,
          category,
          contentType,
          width: sourceWidth,
          height: sourceHeight,
          sourceWidth,
          sourceHeight,
          quality: null,
          strategy: hasAlpha
            ? "alpha-source"
            : "source-pdf",
          encodedBytes: 0,
        });
        continue;
      }

      if (hasAlpha) {
        records.push({
          originalPath: image.dataset.originalPath ?? "",
          sectionId,
          category,
          contentType,
          width: image.naturalWidth,
          height: image.naturalHeight,
          sourceWidth,
          sourceHeight,
          quality: null,
          strategy: "alpha-source",
          encodedBytes: 0,
        });
        continue;
      }

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality / 100);
      });
      if (!blob) {
        throw new Error(
          `Unable to encode the email PDF image: ${
            image.dataset.pdfSource ?? image.src
          }`,
        );
      }

      const objectUrl = URL.createObjectURL(blob);
      image.removeAttribute("srcset");
      image.src = objectUrl;
      await image.decode();
      encodedBytes += blob.size;
      records.push({
        originalPath: image.dataset.originalPath ?? "",
        sectionId,
        category,
        contentType,
        width,
        height,
        sourceWidth,
        sourceHeight,
        quality,
        strategy: "jpeg",
        encodedBytes: blob.size,
      });
    }

    const countBy = (key) =>
      records.reduce((counts, record) => {
        const value = String(record[key]);
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
      }, {});
    const sectionSummary = records.reduce((summary, record) => {
      const current = summary[record.sectionId] ?? {
        count: 0,
        minimumWidth: Number.POSITIVE_INFINITY,
        maximumWidth: 0,
        minimumHeight: Number.POSITIVE_INFINITY,
        maximumHeight: 0,
        qualities: {},
        strategies: {},
        encodedBytes: 0,
      };
      current.count += 1;
      current.minimumWidth = Math.min(
        current.minimumWidth,
        record.width,
      );
      current.maximumWidth = Math.max(
        current.maximumWidth,
        record.width,
      );
      current.minimumHeight = Math.min(
        current.minimumHeight,
        record.height,
      );
      current.maximumHeight = Math.max(
        current.maximumHeight,
        record.height,
      );
      const qualityKey =
        record.quality === null
          ? "lossless"
          : String(record.quality);
      current.qualities[qualityKey] =
        (current.qualities[qualityKey] ?? 0) + 1;
      current.strategies[record.strategy] =
        (current.strategies[record.strategy] ?? 0) + 1;
      current.encodedBytes += record.encodedBytes;
      summary[record.sectionId] = current;
      return summary;
    }, {});

    return {
      profile: qualityProfile,
      convertedImageCount: images.length,
      encodedBytes,
      qualityCounts: countBy("quality"),
      strategyCounts: countBy("strategy"),
      contentTypeCounts: countBy("contentType"),
      sectionSummary,
      hero: records.find(
        (record) => record.sectionId === "hero",
      ),
    };
  }, profile);
}

async function exportVariant(page, {
  emailMode,
  emailHighQuality = false,
  emailProfile = null,
  destination,
}) {
  const url = `${previewUrl}?portfolioPdf=1${
    emailMode ? "&email=1" : ""
  }${emailHighQuality ? "&emailHighQuality=1" : ""}`;

  await page.goto(url, {
    waitUntil: "networkidle0",
    timeout: 180_000,
  });
  const status = await waitForPdfView(page, pdfExpectations);
  const emailImagePreparation = emailProfile
    ? await prepareEmailImages(page, emailProfile)
    : null;

  await page.pdf({
    path: destination,
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    timeout: 180_000,
  });

  const fileStats = await stat(destination);
  return {
    ...status,
    emailImagePreparation,
    path: destination,
    sizeBytes: fileStats.size,
  };
}

async function exportEmailCandidate(page, profile) {
  const destination = path.join(
    emailCandidateDirectory,
    `email-${profile.name}.pdf`,
  );
  const result = await exportVariant(page, {
    emailMode: true,
    emailHighQuality: true,
    emailProfile: profile,
    destination,
  });
  console.log(
    `EMAIL_PDF_CANDIDATE ${JSON.stringify({
      profile: profile.name,
      sizeBytes: result.sizeBytes,
      sizeMiB: result.sizeBytes / mebibyte,
      imagePreparation: result.emailImagePreparation,
    })}`,
  );
  return {
    ...result,
    profile: profile.name,
  };
}

function chooseEmailCandidate(candidates) {
  const acceptable = candidates.filter(
    (candidate) =>
      candidate.sizeBytes >= emailAcceptableMinimumBytes &&
      candidate.sizeBytes <= emailMaximumBytes,
  );
  if (!acceptable.length) return null;

  return acceptable.sort(
    (left, right) =>
      Math.abs(left.sizeBytes - emailTargetBytes) -
      Math.abs(right.sizeBytes - emailTargetBytes),
  )[0];
}

async function exportHighQualityEmailPdf(page) {
  await rm(emailCandidateDirectory, {
    recursive: true,
    force: true,
  });
  await mkdir(emailCandidateDirectory, { recursive: true });

  const candidates = [];
  try {
    const high = await exportEmailCandidate(
      page,
      emailProfiles.high,
    );
    candidates.push(high);

    if (high.sizeBytes < emailPreferredMinimumBytes) {
      const ultra = await exportEmailCandidate(
        page,
        emailProfiles.ultra,
      );
      candidates.push(ultra);
      if (ultra.sizeBytes < emailAcceptableMinimumBytes) {
        const hybridStills = await exportEmailCandidate(
          page,
          emailProfiles.hybridStills,
        );
        candidates.push(hybridStills);
        if (hybridStills.sizeBytes > emailMaximumBytes) {
          candidates.push(
            await exportEmailCandidate(
              page,
              emailProfiles.hybridCoreStills,
            ),
          );
        }
      }
    } else if (high.sizeBytes > emailPreferredMaximumBytes) {
      candidates.push(
        await exportEmailCandidate(page, emailProfiles.balanced),
      );
    }

    let selected = chooseEmailCandidate(candidates);
    if (!selected) {
      const allTooLarge = candidates.every(
        (candidate) => candidate.sizeBytes > emailMaximumBytes,
      );
      if (allTooLarge) {
        candidates.push(
          await exportEmailCandidate(page, emailProfiles.safe),
        );
      }
      selected = chooseEmailCandidate(candidates);
    }

    if (!selected) {
      throw new Error(
        `No high-quality email PDF candidate was within 85-100 MiB: ${candidates
          .map(
            (candidate) =>
              `${candidate.profile}=${(
                candidate.sizeBytes / mebibyte
              ).toFixed(2)} MiB`,
          )
          .join(", ")}`,
      );
    }

    await copyFile(selected.path, emailPdfPath);
    const finalStats = await stat(emailPdfPath);
    if (finalStats.size > emailMaximumBytes) {
      throw new Error(
        `The selected email PDF exceeds 100 MiB: ${(
          finalStats.size / mebibyte
        ).toFixed(2)} MiB`,
      );
    }

    return {
      ...selected,
      path: emailPdfPath,
      sizeBytes: finalStats.size,
      candidates: candidates.map((candidate) => ({
        profile: candidate.profile,
        sizeBytes: candidate.sizeBytes,
        sizeMiB: candidate.sizeBytes / mebibyte,
      })),
    };
  } finally {
    await rm(emailCandidateDirectory, {
      recursive: true,
      force: true,
    });
  }
}

await mkdir(outputDirectory, { recursive: true });
const pdfExpectations = await loadPdfExpectations();

const browserPath = await firstExistingPath(browserCandidates);
if (!browserPath) {
  throw new Error(
    `Chrome or Edge was not found. Checked:\n${browserCandidates.join("\n")}`,
  );
}

let previewProcess = null;
let browser = null;

try {
  if (!skipBuild) {
    await runBuild();
  }
  previewProcess = startPreview();
  await waitForPreview(previewProcess);

  browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    timeout: 120_000,
    protocolTimeout: 180_000,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-gpu",
      "--hide-scrollbars",
      "--font-render-hinting=none",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1684,
    height: 1191,
    deviceScaleFactor: 1,
  });
  await page.emulateMediaType("print");

  const primary = emailHighQualityOnly
    ? null
    : await exportVariant(page, {
        emailMode: false,
        destination: primaryPdfPath,
      });
  const email = await exportHighQualityEmailPdf(page);

  console.log(
    `PDF_EXPORT_RESULT ${JSON.stringify({
      mode: emailHighQualityOnly
        ? "email-high-quality"
        : "primary",
      browserPath,
      expectations: pdfExpectations,
      primary,
      email,
    })}`,
  );
} finally {
  if (browser) {
    await browser.close();
  }
  await stopPreview(previewProcess);
}
