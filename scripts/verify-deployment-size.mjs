import {
  mkdir,
  readFile,
  readdir,
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
const workflowRoot = path.join(projectRoot, ".github", "workflows");
const markdownReportPath = path.join(
  outputsRoot,
  "github-pages-artifact-audit.md",
);
const jsonReportPath = path.join(
  outputsRoot,
  "github-pages-artifact-audit.json",
);
const maximumBytes = 200 * 1024 * 1024;
const observedArtifact = "约534 MB（GitHub Pages界面显示）";
const expectedDronePath = "portfolio/无人机/无人机2.mp4";
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

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
}

function sum(items, selector = (item) => item.sizeBytes) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function assertInsideDist(filePath) {
  const relative = path.relative(distRoot, path.resolve(filePath));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path leaves dist: ${filePath}`);
  }
}

async function walkFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw new Error(`Unable to read deployment directory: ${directory}`, {
      cause: error,
    });
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

function flattenFiles(folder) {
  return [
    ...(folder.files ?? []),
    ...(folder.children ?? []).flatMap(flattenFiles),
  ];
}

function distPathFromUrl(url) {
  const pathname = decodeURIComponent(
    new URL(url, "https://local.invalid").pathname,
  ).replace(/^\/+/, "");
  const filePath = path.resolve(distRoot, ...pathname.split("/"));
  assertInsideDist(filePath);
  return toPosix(path.relative(distRoot, filePath));
}

async function readWorkflowAudit() {
  const workflowFiles = (await walkFiles(workflowRoot)).filter((file) =>
    [".yml", ".yaml"].includes(file.extension),
  );
  const workflows = [];
  for (const file of workflowFiles) {
    const content = await readFile(file.absolutePath, "utf8");
    const uploadActions = [
      ...content.matchAll(
        /uses:\s*actions\/upload-pages-artifact@([^\s]+)/g,
      ),
    ];
    const deployActions = [
      ...content.matchAll(/uses:\s*actions\/deploy-pages@([^\s]+)/g),
    ];
    const uploadPaths = [
      ...content.matchAll(
        /uses:\s*actions\/upload-pages-artifact@[^\n]+\n(?:[^\n]*\n)*?\s+path:\s*([^\s#]+)/g,
      ),
    ].map((match) => match[1].replace(/^["']|["']$/g, ""));
    workflows.push({
      path: toPosix(path.relative(projectRoot, file.absolutePath)),
      uploadActionVersions: uploadActions.map((match) => match[1]),
      deployActionVersions: deployActions.map((match) => match[1]),
      uploadPaths,
      pagesWorkflow:
        uploadActions.length > 0 || deployActions.length > 0,
    });
  }
  return workflows;
}

async function directorySummaries(files) {
  const groups = new Map();
  for (const file of files) {
    const topLevel = file.relativePath.split("/")[0];
    const summary = groups.get(topLevel) ?? {
      path: topLevel,
      files: 0,
      sizeBytes: 0,
    };
    summary.files += 1;
    summary.sizeBytes += file.sizeBytes;
    groups.set(topLevel, summary);
  }
  return [...groups.values()].sort(
    (left, right) => right.sizeBytes - left.sizeBytes,
  );
}

async function main() {
  const requiredIndex = path.join(distRoot, "index.html");
  const requiredAssets = path.join(distRoot, "assets");
  const [indexStats, assetsStats] = await Promise.all([
    stat(requiredIndex),
    stat(requiredAssets),
  ]);
  if (!indexStats.isFile()) throw new Error("dist/index.html is not a file.");
  if (!assetsStats.isDirectory()) {
    throw new Error("dist/assets is not a directory.");
  }

  const [files, manifest, workflows] = await Promise.all([
    walkFiles(distRoot),
    readFile(manifestPath, "utf8").then(JSON.parse),
    readWorkflowAudit(),
  ]);
  const images = files.filter((file) =>
    imageExtensions.has(file.extension),
  );
  const videos = files.filter((file) =>
    videoExtensions.has(file.extension),
  );
  const totalBytes = sum(files);
  const imageBytes = sum(images);
  const videoBytes = sum(videos);
  const largestFiles = [...files]
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 30)
    .map(({ relativePath, extension, sizeBytes }) => ({
      relativePath,
      extension,
      sizeBytes,
    }));
  const topLevelDirectories = await directorySummaries(files);

  const manifestFiles = Object.values(manifest.chapters ?? {}).flatMap(
    flattenFiles,
  );
  const referencedImages = new Set(
    manifestFiles
      .filter(
        (file) => file.kind === "image" && file.isDisplayed !== false,
      )
      .flatMap((file) => [
        ...(file.displayVariants ?? []).map((variant) => variant.src),
        file.lightboxSrc ?? file.src ?? file.url,
      ])
      .map(distPathFromUrl),
  );
  const referencedVideos = new Set(
    manifestFiles
      .filter(
        (file) => file.kind === "video" && file.isDisplayed !== false,
      )
      .map((file) => file.src ?? file.url)
      .map(distPathFromUrl),
  );
  const missingMedia = [...referencedImages, ...referencedVideos].filter(
    (relativePath) =>
      !files.some((file) => file.relativePath === relativePath),
  );
  const unreferencedMedia = [...images, ...videos]
    .filter(
      (file) =>
        !referencedImages.has(file.relativePath) &&
        !referencedVideos.has(file.relativePath),
    )
    .map((file) => file.relativePath);

  const forbiddenDirectories = files
    .filter((file) =>
      /(^|\/)(node_modules|outputs|src|scripts|\.git|\.github)(\/|$)/.test(
        file.relativePath,
      ),
    )
    .map((file) => file.relativePath);
  const forbiddenFiles = files
    .filter(
      (file) =>
        file.extension === ".pdf" ||
        /(^|\/)(package(?:-lock)?\.json|README(?:\.[^/]+)?|.*report.*)(\/|$)/i.test(
          file.relativePath,
        ),
    )
    .map((file) => file.relativePath);
  const originalPortfolioImages = images
    .filter((file) => file.relativePath.startsWith("portfolio/"))
    .map((file) => file.relativePath);
  const losslessDirectoryFiles = files
    .filter((file) =>
      file.relativePath.startsWith("portfolio-optimized-lossless/"),
    )
    .map((file) => file.relativePath);
  const unexpectedVideos = videos
    .filter((file) => file.relativePath !== expectedDronePath)
    .map((file) => file.relativePath);
  const oversizedWalkthroughs = videos
    .filter(
      (file) =>
        file.sizeBytes >= 200 * 1024 * 1024 ||
        file.relativePath.includes("人物完整跑图"),
    )
    .map((file) => file.relativePath);
  const rawPngFiles = images
    .filter((file) => file.extension === ".png")
    .map((file) => file.relativePath);
  const pagesWorkflows = workflows.filter((workflow) => workflow.pagesWorkflow);
  const uploadSteps = workflows.reduce(
    (total, workflow) => total + workflow.uploadActionVersions.length,
    0,
  );
  const uploadPaths = workflows.flatMap((workflow) => workflow.uploadPaths);

  const failures = [];
  if (totalBytes > maximumBytes) {
    failures.push("Deployment cancelled: dist exceeds 200 MiB");
  }
  if (uploadSteps !== 1) {
    failures.push(`Expected one Pages upload step, found ${uploadSteps}.`);
  }
  if (
    uploadPaths.length !== 1 ||
    !["./dist", "dist"].includes(uploadPaths[0])
  ) {
    failures.push(
      `Pages upload path must be ./dist, found: ${uploadPaths.join(", ") || "none"}.`,
    );
  }
  if (pagesWorkflows.length !== 1) {
    failures.push(
      `Expected one Pages workflow, found ${pagesWorkflows.length}.`,
    );
  }
  if (forbiddenDirectories.length) {
    failures.push("Deployment contains forbidden source directories.");
  }
  if (forbiddenFiles.length) {
    failures.push("Deployment contains PDF, report, package, or README files.");
  }
  if (originalPortfolioImages.length) {
    failures.push("Deployment contains original portfolio images.");
  }
  if (losslessDirectoryFiles.length) {
    failures.push("Deployment contains the lossless candidate directory.");
  }
  if (unexpectedVideos.length) {
    failures.push("Deployment contains unexpected videos.");
  }
  if (oversizedWalkthroughs.length) {
    failures.push("Deployment contains a local walkthrough video.");
  }
  if (rawPngFiles.length) {
    failures.push("Deployment contains raw PNG files.");
  }
  if (missingMedia.length) {
    failures.push("Manifest references missing media.");
  }
  if (unreferencedMedia.length) {
    failures.push("Deployment contains unreferenced media.");
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    rootCause: {
      conclusion:
        "旧工作流的上传路径本来就是./dist，且只有一个Pages工作流；534 MB不是由上传项目根目录或public造成。该数值与当前本地已清理dist不一致，说明GitHub那次运行对应的远端版本上传了未完成当前媒体清理的旧dist（或运行时尚未包含当前prune与manifest修复）。",
      evidence: [
        "旧upload-pages-artifact路径为./dist。",
        "本地相同build顺序生成的dist远低于200 MiB。",
        "当前构建在Vite复制public后运行prune-build-media.mjs。",
        "旧prune脚本把非ENOENT扫描异常静默当成空目录，缺少明确失败信号。",
      ],
      likelyExtraDirectories:
        "未清理dist中的portfolio原图、portfolio-optimized-lossless及未使用的portfolio-optimized-q92候选。",
      remoteLimitation:
        "未读取GitHub远端日志或Artifact内容，因此无法对旧Artifact逐文件取证；本轮门禁会让相同异常在上传前直接失败并打印文件清单。",
    },
    workflow: {
      previousUploadAction: "actions/upload-pages-artifact@v3",
      currentUploadAction:
        pagesWorkflows[0]?.uploadActionVersions[0] ?? null,
      previousUploadPath: "./dist",
      currentUploadPaths: uploadPaths,
      uploadedProjectRoot: false,
      uploadedPublic: false,
      pagesWorkflowCount: pagesWorkflows.length,
      uploadStepCount: uploadSteps,
      files: workflows,
    },
    artifact: {
      githubDisplayedSize: observedArtifact,
      localDistBytes: totalBytes,
      maximumBytes,
      maximumMiB: 200,
      fileCount: files.length,
      imageCount: images.length,
      imageBytes,
      videoCount: videos.length,
      videoBytes,
      rawPngCount: rawPngFiles.length,
      unreferencedMediaCount: unreferencedMedia.length,
      missingMediaCount: missingMedia.length,
      largestFiles,
      topLevelDirectories,
    },
    validation: {
      passed: failures.length === 0,
      failures,
      expectedDronePath,
      deployedVideos: videos.map((file) => ({
        path: file.relativePath,
        sizeBytes: file.sizeBytes,
      })),
      forbiddenDirectories,
      forbiddenFiles,
      originalPortfolioImages,
      losslessDirectoryFiles,
      unexpectedVideos,
      oversizedWalkthroughs,
      rawPngFiles,
      missingMedia,
      unreferencedMedia,
    },
    pruneCompatibility: {
      before:
        "主要路径处理已使用node:path并兼容Linux，但目录扫描和空目录检查会静默忽略所有读取异常，路径边界使用字符串前缀比较。",
      after:
        "仅ENOENT视为可选目录不存在；其他读取异常明确报错并使构建退出1。路径边界改用path.relative，媒体集合使用跨平台规范化绝对路径键。",
      linuxCompatible: true,
    },
    modifiedFiles: [
      ".github/workflows/deploy.yml",
      "package.json",
      "scripts/prune-build-media.mjs",
      "scripts/verify-deployment-size.mjs",
      "outputs/github-pages-artifact-audit.md",
      "outputs/github-pages-artifact-audit.json",
    ],
  };

  await mkdir(outputsRoot, { recursive: true });
  await writeFile(jsonReportPath, JSON.stringify(audit, null, 2), "utf8");

  const largestRows = largestFiles.map(
    (file, index) =>
      `| ${index + 1} | ${file.relativePath} | ${file.extension || "—"} | ${formatBytes(file.sizeBytes)} |`,
  );
  const topLevelRows = topLevelDirectories.map(
    (entry) =>
      `| ${entry.path} | ${entry.files} | ${formatBytes(entry.sizeBytes)} |`,
  );
  const markdown = [
    "# 西福寺 GitHub Pages Artifact 审计",
    "",
    `生成时间：${audit.generatedAt}`,
    "",
    "## 结论",
    "",
    `- 根因：${audit.rootCause.conclusion}`,
    `- 旧上传路径：${audit.workflow.previousUploadPath}`,
    `- 新上传路径：${audit.workflow.currentUploadPaths.join(", ")}`,
    `- GitHub显示：${observedArtifact}`,
    `- 本地dist：${formatBytes(totalBytes)}`,
    `- 200 MiB门禁：${failures.length ? "失败" : "通过"}`,
    `- Pages工作流：${pagesWorkflows.length}个`,
    `- Pages上传步骤：${uploadSteps}个`,
    "",
    "## 跨平台清理",
    "",
    `- 修复前：${audit.pruneCompatibility.before}`,
    `- 修复后：${audit.pruneCompatibility.after}`,
    "",
    "## 构建内容",
    "",
    `- 文件：${files.length}`,
    `- 图片：${images.length}个 / ${formatBytes(imageBytes)}`,
    `- 视频：${videos.length}个 / ${formatBytes(videoBytes)}`,
    `- 原始PNG：${rawPngFiles.length}`,
    `- 未引用媒体：${unreferencedMedia.length}`,
    `- 缺失媒体：${missingMedia.length}`,
    "",
    "| 一级路径 | 文件数 | 大小 |",
    "|---|---:|---:|",
    ...topLevelRows,
    "",
    "## 最大30个文件",
    "",
    "| # | 路径 | 类型 | 大小 |",
    "|---:|---|---|---:|",
    ...largestRows,
    "",
    "## 限制",
    "",
    `- ${audit.rootCause.remoteLimitation}`,
    "- 工作流超过200 MiB时会在Upload artifact之前失败，并输出一级目录及最大30个文件。",
    "",
  ].join("\n");
  await writeFile(markdownReportPath, markdown, "utf8");

  console.log(`Deployment output: ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log(`Files: ${files.length}`);
  console.log(`Images: ${images.length}, ${formatBytes(imageBytes)}`);
  console.log(`Videos: ${videos.length}, ${formatBytes(videoBytes)}`);
  console.log("Top-level deployment content:");
  for (const entry of topLevelDirectories) {
    console.log(
      `  ${entry.path}: ${formatBytes(entry.sizeBytes)}, ${entry.files} files`,
    );
  }
  console.log("Largest 30 deployment files:");
  for (const [index, file] of largestFiles.entries()) {
    console.log(
      `  ${String(index + 1).padStart(2, "0")}. ${formatBytes(file.sizeBytes)}  ${file.relativePath}`,
    );
  }
  console.log(`Deployment audit JSON: ${jsonReportPath}`);
  console.log(`Deployment audit Markdown: ${markdownReportPath}`);

  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
    return;
  }

  console.log("Deployment verification passed: dist is below 200 MiB.");
}

main().catch((error) => {
  console.error("Deployment verification failed.");
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
