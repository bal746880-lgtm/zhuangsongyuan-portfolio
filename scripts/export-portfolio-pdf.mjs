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
const highPdfPath = path.join(
  outputDirectory,
  "庄松源_西福寺_作品集_高质量版_90MB.pdf",
);
const lightPdfPath = path.join(
  outputDirectory,
  "庄松源_西福寺_作品集_轻量版_20MB.pdf",
);
const candidateDirectory = path.join(
  projectRoot,
  "tmp",
  "pdfs",
  "portfolio-export-candidates",
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
const onlyHigh = process.argv.includes("--only=90mb");
const onlyLight = process.argv.includes("--only=20mb");
const skipBuild = process.argv.includes("--skip-build");
const expectedVegetationTitle = "植被AI辅助资产管线落地";
const forbiddenVegetationTitles = [
  "ZB雕刻树干，八猴高低模烘焙及Speedtree制作",
  "ZB雕刻树干，八猴高低模烘焙及ST焊接",
  "ZBrush 雕刻树干八猴烘焙高低模与Speedtree焊接制作",
];
const expectedChapterOrder = [
  "封面",
  "个人介绍与经历",
  "主要静帧",
  "项目概览与个人职责",
  "规划与跑图路线",
  "模块化建筑与道具",
  "程序化材质与场景应用",
  "植被全流程制作",
  "岩石苔藓PCG系统",
  "场景静帧",
  "项目职责与联系方式",
];
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
for (const profile of Object.values(emailProfiles)) {
  profile.layoutMaxWidths = {
    five: 900,
    four: 1200,
    three: 1440,
    two: 2000,
  };
}
const lightProfiles = [
  {
    name: "light-high",
    hero: 96,
    scene: 92,
    asset: 92,
    portrait: 94,
    technical: 93,
    maxWidths: { hero: 1900, scene: 1700, asset: 1600, portrait: 1400, technical: 1900 },
    layoutMaxWidths: { five: 620, four: 900, three: 960, two: 1400 },
    flattenAlpha: true,
  },
  {
    name: "light-balanced",
    hero: 95,
    scene: 90,
    asset: 90,
    portrait: 93,
    technical: 92,
    maxWidths: { hero: 1800, scene: 1500, asset: 1400, portrait: 1200, technical: 1800 },
    layoutMaxWidths: { five: 560, four: 820, three: 900, two: 1250 },
    flattenAlpha: true,
  },
  {
    name: "light-compact",
    hero: 94,
    scene: 88,
    asset: 88,
    portrait: 92,
    technical: 89,
    maxWidths: { hero: 1650, scene: 1250, asset: 1100, portrait: 1000, technical: 1500 },
    layoutMaxWidths: { five: 480, four: 700, three: 760, two: 1000 },
    flattenAlpha: true,
  },
];

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
  const chapter = (name) => manifest.chapters?.[name];
  const vegetation = chapter("植被全流程与Billboard制作");
  const modular = chapter("模块化建筑与道具");
  const pcg = chapter("岩石苔藓PCG系统");
  const propAiFolder = modular?.children?.find(
    (folder) => folder.name?.includes("道具AI") && folder.name?.includes("管线"),
  );
  const vegetationFolders = (vegetation?.children ?? [])
    .filter(
      (folder) =>
        Number.isFinite(folder.sortValue) &&
        folder.sortValue >= 0 &&
        folder.sortValue <= 18,
    )
    .sort((left, right) => left.sortValue - right.sortValue);
  const pcgAssetFolder = pcg?.children?.find((folder) => folder.sortValue === 7);
  const pcgResultFolder = pcg?.children?.find((folder) => folder.sortValue === 8);

  const pdfImages = [
    ...imagesInFolder(chapter("主视觉封面")),
    ...imagesInFolder(chapter("个人简介")),
    ...imagesInFolder(chapter("最强静帧")),
    ...imagesInFolder(chapter("项目概览与个人职责")),
    ...imagesInFolder(chapter("规划与跑图路线")),
    ...imagesInFolder(modular),
    ...imagesInFolder(propAiFolder),
    ...imagesInFolder(chapter("程序化材质与场景应用")),
    ...imagesInFolder(chapter("SD节点展示")),
    ...vegetationFolders.flatMap(imagesInFolder),
    ...imagesInFolder(pcg),
    ...imagesInFolder(pcgAssetFolder),
    ...imagesInFolder(pcgResultFolder),
    ...imagesInFolder(chapter("场景静帧")),
  ];
  const vegetationStepOrders = Object.fromEntries(
    Array.from({ length: 17 }, (_, index) => index + 1).map((step) => {
      const folder = vegetationFolders.find((candidate) => candidate.sortValue === step);
      return [
        String(step),
        imagesInFolder(folder).map(
          (file) =>
            file.sortValue ??
            Number(file.name.match(/^(\d+)/)?.[1] ?? -1),
        ),
      ];
    }),
  );

  return {
    generatedAt: manifest.generatedAt ?? null,
    websiteImageCount: pdfImages.length,
    pdfImageCount: pdfImages.length,
    expectedChapterOrder,
    expectedVegetationTitle,
    forbiddenVegetationTitles,
    vegetationStepOrders,
    propAiImageCount: imagesInFolder(propAiFolder).length,
    leafNormalImageCount: imagesInFolder(
      vegetationFolders.find((folder) => folder.sortValue === 11),
    ).length,
    aiFoliageReferenceCount: imagesInFolder(
      vegetationFolders.find((folder) => folder.sortValue === 9),
    ).length,
    pcgProcessImageCount: imagesInFolder(pcg).filter(
      (file) => file.sortValue !== null && file.sortValue <= 6,
    ).length,
    pcgAssetImageCount: imagesInFolder(pcgAssetFolder).length,
    pcgResultImageCount: imagesInFolder(pcgResultFolder).length,
    selectedStillsImageCount: imagesInFolder(chapter("最强静帧")).length,
    materialsImageCount: imagesInFolder(chapter("程序化材质与场景应用")).length,
    sdNodeImageCount: imagesInFolder(chapter("SD节点展示")).length,
    speedtreePageImageCounts: (() => {
      const speedtreeCount = imagesInFolder(
        vegetationFolders.find((folder) => folder.sortValue === 14),
      ).length;
      return [Math.ceil(speedtreeCount / 2), Math.floor(speedtreeCount / 2)].filter(Boolean);
    })(),
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
    const images = Array.from(document.querySelectorAll(".portfolio-pdf img"));
    const pages = Array.from(document.querySelectorAll(".pdf-page"));
    const visibleText = document.querySelector(".portfolio-pdf")?.textContent ?? "";
    const failedImages = images
      .filter((image) => !image.complete || !image.naturalWidth)
      .map((image) => image.dataset.pdfSource ?? image.currentSrc ?? image.src);
    const pageKindCounts = pages.reduce((counts, pdfPage) => {
      const kind = pdfPage.getAttribute("data-pdf-page-kind") ?? "unknown";
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {});
    const chapters = pages
      .map((pdfPage) => pdfPage.getAttribute("data-pdf-chapter"))
      .filter(Boolean);
    const pageLabels = pages.map(
      (pdfPage) => pdfPage.getAttribute("data-pdf-page-label") ?? "未命名页面",
    );
    const emptyPages = pages
      .filter(
        (pdfPage) =>
          !pdfPage.querySelector("img") &&
          (pdfPage.textContent?.trim().length ?? 0) < 3,
      )
      .map((pdfPage) => pdfPage.getAttribute("data-pdf-page-label") ?? "未命名页面");
    const overflowPages = pages
      .filter(
        (pdfPage) =>
          pdfPage.scrollWidth > pdfPage.clientWidth + 1 ||
          pdfPage.scrollHeight > pdfPage.clientHeight + 1,
      )
      .map((pdfPage) => ({
        label: pdfPage.getAttribute("data-pdf-page-label") ?? "未命名页面",
        width: [pdfPage.clientWidth, pdfPage.scrollWidth],
        height: [pdfPage.clientHeight, pdfPage.scrollHeight],
      }));
    const vegetationStepOrders = Object.fromEntries(
      Object.keys(expected.vegetationStepOrders).map((step) => [
        step,
        Array.from(
          document.querySelectorAll(
            `.pdf-page[data-pdf-step="${step}"] .pdf-media-frame`,
          ),
        ).map((frame) => Number(frame.getAttribute("data-sort-value"))),
      ]),
    );

    const portrait = document.querySelector('[data-pdf-portrait="true"] img');
    const portraitRect = portrait?.getBoundingClientRect();
    const imageFitErrors = images
      .filter((image) => getComputedStyle(image).objectFit !== "contain")
      .map((image) => image.dataset.pdfSource ?? image.currentSrc ?? image.src);
    const imageBoundsErrors = images
      .filter((image) => {
        const imageRect = image.getBoundingClientRect();
        const pageRect = image.closest(".pdf-page")?.getBoundingClientRect();
        if (!pageRect || !image.naturalWidth || !image.naturalHeight) return true;
        const scale = Math.min(
          imageRect.width / image.naturalWidth,
          imageRect.height / image.naturalHeight,
        );
        const renderedWidth = image.naturalWidth * scale;
        const renderedHeight = image.naturalHeight * scale;
        const renderedLeft = imageRect.left + (imageRect.width - renderedWidth) / 2;
        const renderedTop = imageRect.top + (imageRect.height - renderedHeight) / 2;
        return renderedLeft < pageRect.left - 1 || renderedTop < pageRect.top - 1 || renderedLeft + renderedWidth > pageRect.right + 1 || renderedTop + renderedHeight > pageRect.bottom + 1;
      })
      .map((image) => image.dataset.pdfSource ?? image.currentSrc ?? image.src);
    const pageImageCounts = (selector) =>
      Array.from(document.querySelectorAll(selector)).map(
        (pdfPage) => pdfPage.querySelectorAll("img").length,
      );

    return {
      ready: window.__PORTFOLIO_PDF_READY__ === true,
      errors: [...new Set([...(window.__PORTFOLIO_PDF_ERRORS__ ?? []), ...failedImages])],
      imageCount: images.length,
      pageCount: pages.length,
      pageKindCounts,
      pageLabels,
      chapters,
      emptyPages,
      overflowPages,
      vegetationStepOrders,
      videoCount: document.querySelectorAll("video").length,
      iframeCount: document.querySelectorAll("iframe").length,
      navigationCount: document.querySelectorAll("nav, .navigation").length,
      buttonCount: document.querySelectorAll("button").length,
      fontStatus: document.fonts.status,
      propAiImageCount: document.querySelectorAll(".pdf-page--ai-media img").length,
      leafNormalImageCount: document.querySelectorAll(
        '.pdf-page[data-pdf-step="11"] .pdf-leaf-normal-grid img',
      ).length,
      aiFoliageReferenceCount: document.querySelectorAll(
        '.pdf-page[data-pdf-step="9"] img',
      ).length,
      pcgProcessImageCount: document.querySelectorAll(
        '[data-pdf-page-label^="PCG生成与过滤过程"] img',
      ).length,
      pcgAssetImageCount: document.querySelectorAll(
        '[data-pdf-page-label^="苔藓资产制作流程"] img',
      ).length,
      pcgResultImageCount: document.querySelectorAll(
        '[data-pdf-page-label^="PCG最终场景应用"] img',
      ).length,
      capabilityCount: document.querySelectorAll(".pdf-capabilities li").length,
      portraitVisible: Boolean(
        portrait && portrait.naturalWidth && portraitRect && portraitRect.width > 1 && portraitRect.height > 1,
      ),
      portraitSource: portrait?.dataset.pdfSource ?? null,
      imageFitErrors,
      imageBoundsErrors,
      selectedStillsTitleImageCount: document.querySelector('[data-pdf-page-label="主要静帧标题"]')?.querySelectorAll("img").length ?? -1,
      selectedStillsPageImageCounts: pageImageCounts('[data-pdf-page-label^="主要静帧 "]'),
      materialsTitleImageCount: document.querySelector('[data-pdf-page-label="程序化材质与场景应用标题"]')?.querySelectorAll("img").length ?? -1,
      materialsPageImageCounts: pageImageCounts('[data-pdf-page-label^="程序化材质与场景应用 "]'),
      sdPageImageCounts: pageImageCounts('[data-pdf-page-label="Substance Designer节点"]'),
      vegetationFlowPageCount: document.querySelectorAll('[data-pdf-page-label="植被AI辅助资产管线"]').length,
      vegetationPhaseCount: document.querySelectorAll('[data-pdf-page-label="植被AI辅助资产管线"] [data-pdf-vegetation-phase]').length,
      speedtreePageImageCounts: pageImageCounts('.pdf-page--speedtree'),
      pcgCombinedPageImageCounts: pageImageCounts('[data-pdf-page-label="PCG生成与过滤过程"]'),
      pcgFlowStepCount: document.querySelectorAll('[data-pdf-page-label="PCG生成与过滤过程"] .pdf-pipeline-board li').length,
      mossAssetPageImageCounts: pageImageCounts('[data-pdf-page-label="苔藓资产制作流程"]'),
      hasWebsiteLink: Boolean(
        document.querySelector('.pdf-contact a[href="https://zhuangsongyuan.online"]'),
      ),
      hasExpectedVegetationTitle: visibleText.includes(expected.expectedVegetationTitle),
      forbiddenVegetationTitles: expected.forbiddenVegetationTitles.filter(
        (title) => visibleText.includes(title),
      ),
      bvids: visibleText.match(/BV[0-9A-Za-z]{10}/g) ?? [],
      variant: document.querySelector(".portfolio-pdf")?.getAttribute("data-pdf-variant") ?? "unknown",
    };
  }, expectations);

  if (!status.ready || status.errors.length) {
    throw new Error(`PDF view contains failed images:\n${status.errors.join("\n")}`);
  }
  if (status.imageCount !== expectations.pdfImageCount) {
    throw new Error(
      `PDF image count mismatch: expected ${expectations.pdfImageCount}, rendered ${status.imageCount}.`,
    );
  }
  if (JSON.stringify(status.chapters) !== JSON.stringify(expectations.expectedChapterOrder)) {
    throw new Error(`PDF chapter order mismatch:\n${status.chapters.join("\n")}`);
  }
  if (!status.hasExpectedVegetationTitle) {
    throw new Error(`The current vegetation title is missing: ${expectations.expectedVegetationTitle}`);
  }
  if (status.forbiddenVegetationTitles.length) {
    throw new Error(
      `Outdated vegetation titles remain in the PDF view: ${status.forbiddenVegetationTitles.join(", ")}`,
    );
  }
  if (
    JSON.stringify(status.vegetationStepOrders) !==
    JSON.stringify(expectations.vegetationStepOrders)
  ) {
    throw new Error(
      `Vegetation step order mismatch: ${JSON.stringify(status.vegetationStepOrders)}`,
    );
  }
  for (const key of [
    "propAiImageCount",
    "leafNormalImageCount",
    "aiFoliageReferenceCount",
    "pcgProcessImageCount",
    "pcgAssetImageCount",
    "pcgResultImageCount",
  ]) {
    if (status[key] !== expectations[key]) {
      throw new Error(`${key} mismatch: expected ${expectations[key]}, rendered ${status[key]}.`);
    }
  }
  if (status.capabilityCount !== 5 || !status.hasWebsiteLink || !status.portraitVisible) {
    throw new Error(`Latest about/contact content is incomplete: ${JSON.stringify(status)}`);
  }
  if (status.imageFitErrors.length || status.imageBoundsErrors.length) {
    throw new Error(
      `PDF images are cropped or outside page bounds: ${JSON.stringify({ fit: status.imageFitErrors, bounds: status.imageBoundsErrors })}`,
    );
  }
  const expectedSingleImagePages = (count) => Array.from({ length: count }, () => 1);
  if (
    status.selectedStillsTitleImageCount !== 0 ||
    JSON.stringify(status.selectedStillsPageImageCounts) !== JSON.stringify(expectedSingleImagePages(expectations.selectedStillsImageCount)) ||
    status.materialsTitleImageCount !== 0 ||
    JSON.stringify(status.materialsPageImageCounts) !== JSON.stringify(expectedSingleImagePages(expectations.materialsImageCount)) ||
    JSON.stringify(status.sdPageImageCounts) !== JSON.stringify([expectations.sdNodeImageCount]) ||
    status.vegetationFlowPageCount !== 1 ||
    status.vegetationPhaseCount !== 2 ||
    JSON.stringify(status.speedtreePageImageCounts) !== JSON.stringify(expectations.speedtreePageImageCounts) ||
    JSON.stringify(status.pcgCombinedPageImageCounts) !== JSON.stringify([expectations.pcgProcessImageCount]) ||
    status.pcgFlowStepCount !== 6 ||
    JSON.stringify(status.mossAssetPageImageCounts) !== JSON.stringify([expectations.pcgAssetImageCount])
  ) {
    throw new Error(`Targeted PDF layout validation failed: ${JSON.stringify(status)}`);
  }
  if (status.bvids.length) {
    throw new Error(`The PDF view contains Bilibili identifiers: ${status.bvids.join(", ")}`);
  }
  if (status.videoCount || status.iframeCount || status.navigationCount || status.buttonCount) {
    throw new Error(`PDF view contains forbidden interactive media: ${JSON.stringify(status)}`);
  }
  if (status.emptyPages.length || status.overflowPages.length) {
    throw new Error(
      `PDF pages are empty or overflow: ${JSON.stringify({ empty: status.emptyPages, overflow: status.overflowPages })}`,
    );
  }
  if (status.pageCount < 1) throw new Error("PDF view did not render any pages.");
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
      const layoutType =
        image.closest("[data-pdf-layout]")?.getAttribute("data-pdf-layout") ??
        "stack";
      const contentMaximumWidth =
        qualityProfile.maxWidths?.[contentType] ?? sourceWidth;
      const layoutMaximumWidth =
        qualityProfile.layoutMaxWidths?.[layoutType] ?? sourceWidth;
      const maximumWidth = Math.min(
        contentMaximumWidth,
        layoutMaximumWidth,
      );
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

      if (hasAlpha && qualityProfile.flattenAlpha) {
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#181818";
        context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = "source-over";
      }

      if (hasAlpha && !qualityProfile.flattenAlpha) {
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

const loadedPdfPages = new WeakSet();

async function preparePdfDom(page) {
  if (!loadedPdfPages.has(page)) {
    await page.goto(
      `${previewUrl}?portfolioPdf=1&email=1&emailHighQuality=1`,
      { waitUntil: "networkidle0", timeout: 180_000 },
    );
    const status = await waitForPdfView(page, pdfExpectations);
    await page.evaluate(() => {
      window.__PORTFOLIO_PDF_ORIGINAL_IMAGES__ = Array.from(
        document.querySelectorAll(".portfolio-pdf img"),
      ).map((image) => ({
        src: image.getAttribute("src"),
        srcset: image.getAttribute("srcset"),
      }));
    });
    loadedPdfPages.add(page);
    return status;
  }

  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll(".portfolio-pdf img"));
    const originals = window.__PORTFOLIO_PDF_ORIGINAL_IMAGES__ ?? [];
    if (images.length !== originals.length) {
      throw new Error("PDF image source cache no longer matches the document.");
    }
    await Promise.all(
      images.map(async (image, index) => {
        if (image.src.startsWith("blob:")) URL.revokeObjectURL(image.src);
        const original = originals[index];
        if (original.src) image.setAttribute("src", original.src);
        if (original.srcset) image.setAttribute("srcset", original.srcset);
        else image.removeAttribute("srcset");
        await image.decode();
      }),
    );
  });
  return waitForPdfView(page, pdfExpectations);
}

async function exportVariant(page, {
  emailProfile = null,
  destination,
}) {
  const status = await preparePdfDom(page);
  const emailImagePreparation = emailProfile
    ? await prepareEmailImages(page, emailProfile)
    : null;

  await mkdir(path.dirname(destination), { recursive: true });
  await page.pdf({
    path: destination,
    width: "13.333333in",
    height: "7.5in",
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
    candidateDirectory,
    `email-${profile.name}.pdf`,
  );
  const result = await exportVariant(page, {
    emailMode: true,
    emailHighQuality: true,
    emailProfile: profile,
    destination,
  });
  console.log(
    `HIGH_PDF_CANDIDATE ${JSON.stringify({
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

async function exportHighQualityPdf(page) {
  await rm(candidateDirectory, { recursive: true, force: true });
  await mkdir(candidateDirectory, { recursive: true });

  const candidates = [];
  try {
    const natural = await exportVariant(page, {
      emailMode: false,
      destination: path.join(candidateDirectory, "high-natural.pdf"),
    });
    candidates.push({ ...natural, profile: "natural-high", additionalLossyCompression: false });
    console.log(
      `HIGH_PDF_CANDIDATE ${JSON.stringify({
        profile: "natural-high",
        sizeBytes: natural.sizeBytes,
        sizeMiB: natural.sizeBytes / mebibyte,
        additionalLossyCompression: false,
      })}`,
    );

    let selected = candidates[0];
    if (selected.sizeBytes > emailMaximumBytes) {
      const adjusted = await exportEmailCandidate(page, emailProfiles.ultra);
      selected = {
        ...adjusted,
        profile: "ultra",
        additionalLossyCompression: true,
      };
      candidates.push(selected);
    }

    if (selected.sizeBytes > emailMaximumBytes) {
      throw new Error(
        `The high-quality PDF still exceeds 100 MiB after one adjustment: ${(selected.sizeBytes / mebibyte).toFixed(2)} MiB.`,
      );
    }

    await copyFile(selected.path, highPdfPath);
    const finalStats = await stat(highPdfPath);
    return {
      ...selected,
      path: highPdfPath,
      sizeBytes: finalStats.size,
      adjustmentRounds: candidates.length - 1,
      candidates: candidates.map((candidate) => ({
        profile: candidate.profile,
        sizeBytes: candidate.sizeBytes,
        sizeMiB: candidate.sizeBytes / mebibyte,
        additionalLossyCompression:
          candidate.additionalLossyCompression ?? true,
      })),
    };
  } finally {
    await rm(candidateDirectory, { recursive: true, force: true });
  }
}

async function exportLightPdf(page) {
  const preferredMinimumBytes = 17 * mebibyte;
  const preferredMaximumBytes = 19.8 * mebibyte;
  const maximumBytes = 20 * mebibyte;
  const targetBytes = 18.5 * mebibyte;

  await rm(candidateDirectory, { recursive: true, force: true });
  await mkdir(candidateDirectory, { recursive: true });

  const candidates = [];
  try {
    const profiles = lightProfiles.slice(0, 3);
    for (const profile of profiles) {
      const destination = path.join(candidateDirectory, `${profile.name}.pdf`);
      const result = await exportVariant(page, {
        emailMode: true,
        emailHighQuality: true,
        emailProfile: profile,
        destination,
      });
      candidates.push({ ...result, profile: profile.name });
      console.log(
        `LIGHT_PDF_CANDIDATE ${JSON.stringify({
          profile: profile.name,
          sizeBytes: result.sizeBytes,
          sizeMiB: result.sizeBytes / mebibyte,
          imagePreparation: result.emailImagePreparation,
        })}`,
      );

      if (result.sizeBytes <= preferredMaximumBytes) break;
    }

    const underLimit = candidates.filter(
      (candidate) => candidate.sizeBytes < maximumBytes,
    );
    if (!underLimit.length) {
      throw new Error(
        `No lightweight PDF candidate is below 20 MiB: ${candidates
          .map(
            (candidate) =>
              `${candidate.profile}=${(candidate.sizeBytes / mebibyte).toFixed(2)} MiB`,
          )
          .join(", ")}`,
      );
    }

    const preferred = underLimit.filter(
      (candidate) => candidate.sizeBytes >= preferredMinimumBytes,
    );
    const pool = preferred.length ? preferred : underLimit;
    const selected = pool.sort(
      (left, right) =>
        Math.abs(left.sizeBytes - targetBytes) -
        Math.abs(right.sizeBytes - targetBytes),
    )[0];

    await copyFile(selected.path, lightPdfPath);
    const finalStats = await stat(lightPdfPath);
    if (finalStats.size >= maximumBytes) {
      throw new Error(
        `The selected lightweight PDF is not strictly below 20 MiB: ${(finalStats.size / mebibyte).toFixed(2)} MiB`,
      );
    }

    return {
      ...selected,
      path: lightPdfPath,
      sizeBytes: finalStats.size,
      adjustmentRounds: candidates.length - 1,
      candidates: candidates.map((candidate) => ({
        profile: candidate.profile,
        sizeBytes: candidate.sizeBytes,
        sizeMiB: candidate.sizeBytes / mebibyte,
      })),
    };
  } finally {
    await rm(candidateDirectory, { recursive: true, force: true });
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
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  await page.emulateMediaType("print");

  const high = onlyLight ? null : await exportHighQualityPdf(page);
  const light = onlyHigh ? null : await exportLightPdf(page);

  if (
    high &&
    light &&
    (high.pageCount !== light.pageCount || high.imageCount !== light.imageCount)
  ) {
    throw new Error(
      `PDF variants are inconsistent: high=${high.pageCount}/${high.imageCount}, light=${light.pageCount}/${light.imageCount}.`,
    );
  }

  console.log(
    `PDF_EXPORT_RESULT ${JSON.stringify({
      mode: onlyHigh ? "90mb" : onlyLight ? "20mb" : "both",
      browserPath,
      expectations: pdfExpectations,
      high,
      light,
    })}`,
  );
} finally {
  if (browser) {
    await browser.close();
  }
  await stopPreview(previewProcess);
}
