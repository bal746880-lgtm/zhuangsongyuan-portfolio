import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectManifestMediaPaths } from "./prepare-pages-dist.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const targetArgument = process.argv[2] ?? "pages-dist";
const deploymentRoot = path.resolve(projectRoot, targetArgument);
const distRoot = path.join(projectRoot, "dist");
const outputsRoot = path.join(projectRoot, "outputs");
const manifestPath = path.join(
  deploymentRoot,
  "portfolio",
  "manifest.json",
);
const workflowRoot = path.join(projectRoot, ".github", "workflows");
const prepareReportPath = path.join(
  outputsRoot,
  "pages-dist-prepare-report.json",
);
const markdownReportPath = path.join(
  outputsRoot,
  "github-pages-artifact-audit.md",
);
const jsonReportPath = path.join(
  outputsRoot,
  "github-pages-artifact-audit.json",
);
const maximumBytes = 200 * 1024 * 1024;
const maximumSingleFileBytes = 100 * 1024 * 1024;
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

function assertInsideProject(candidate) {
  const relative = path.relative(projectRoot, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Deployment target must stay inside the project: ${candidate}`);
  }
}

function assertInsideDeployment(candidate) {
  const relative = path.relative(deploymentRoot, path.resolve(candidate));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path leaves deployment directory: ${candidate}`);
  }
}

async function walkFiles(directory, relativeRoot = directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw new Error(`Unable to read directory: ${directory}`, {
      cause: error,
    });
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(entryPath, relativeRoot)));
      continue;
    }
    if (!entry.isFile()) continue;
    const fileStats = await stat(entryPath);
    files.push({
      absolutePath: entryPath,
      relativePath: toPosix(path.relative(relativeRoot, entryPath)),
      extension: path.extname(entry.name).toLowerCase(),
      sizeBytes: fileStats.size,
    });
  }
  return files;
}

function deploymentPathFromManifest(relativePath) {
  const filePath = path.resolve(
    deploymentRoot,
    ...relativePath.split("/"),
  );
  assertInsideDeployment(filePath);
  return toPosix(path.relative(deploymentRoot, filePath));
}

async function readWorkflowAudit() {
  const files = await walkFiles(workflowRoot, projectRoot);
  const workflows = [];
  for (const file of files.filter((item) =>
    [".yml", ".yaml"].includes(item.extension),
  )) {
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
      path: file.relativePath,
      uploadActionVersions: uploadActions.map((match) => match[1]),
      deployActionVersions: deployActions.map((match) => match[1]),
      uploadPaths,
      pagesWorkflow:
        uploadActions.length > 0 || deployActions.length > 0,
    });
  }
  return workflows;
}

function directorySummaries(files) {
  const groups = new Map();
  for (const file of files) {
    const topLevel = file.relativePath.split("/")[0];
    const entry = groups.get(topLevel) ?? {
      path: topLevel,
      files: 0,
      sizeBytes: 0,
    };
    entry.files += 1;
    entry.sizeBytes += file.sizeBytes;
    groups.set(topLevel, entry);
  }
  return [...groups.values()].sort(
    (left, right) => right.sizeBytes - left.sizeBytes,
  );
}

async function main() {
  assertInsideProject(deploymentRoot);
  const [indexStats, assetsStats] = await Promise.all([
    stat(path.join(deploymentRoot, "index.html")),
    stat(path.join(deploymentRoot, "assets")),
  ]);
  if (!indexStats.isFile()) {
    throw new Error(`${targetArgument}/index.html is missing.`);
  }
  if (!assetsStats.isDirectory()) {
    throw new Error(`${targetArgument}/assets is missing.`);
  }

  const [files, distFiles, manifest, workflows, prepareReport] =
    await Promise.all([
      walkFiles(deploymentRoot),
      walkFiles(distRoot),
      readFile(manifestPath, "utf8").then(JSON.parse),
      readWorkflowAudit(),
      readFile(prepareReportPath, "utf8").then(JSON.parse),
    ]);
  const images = files.filter((file) =>
    imageExtensions.has(file.extension),
  );
  const videos = files.filter((file) =>
    videoExtensions.has(file.extension),
  );
  const codeFiles = files.filter((file) =>
    [".html", ".css", ".js"].includes(file.extension),
  );
  const manifestMedia = collectManifestMediaPaths(manifest).map(
    deploymentPathFromManifest,
  );
  const referencedMedia = new Set(manifestMedia);
  const deployedMedia = [...images, ...videos];
  const missingMedia = manifestMedia.filter(
    (relativePath) =>
      !files.some((file) => file.relativePath === relativePath),
  );
  const unreferencedMedia = deployedMedia
    .filter((file) => !referencedMedia.has(file.relativePath))
    .map((file) => file.relativePath);
  const totalBytes = sum(files);
  const distBytes = sum(distFiles);
  const imageBytes = sum(images);
  const videoBytes = sum(videos);
  const codeBytes = sum(codeFiles);
  const topLevelDirectories = directorySummaries(files);
  const largestFiles = [...files]
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, 30)
    .map(({ relativePath, extension, sizeBytes }) => ({
      relativePath,
      extension,
      sizeBytes,
    }));

  const rawPngFiles = images
    .filter((file) => file.extension === ".png")
    .map((file) => file.relativePath);
  const originalPortfolioImages = images
    .filter((file) => file.relativePath.startsWith("portfolio/"))
    .map((file) => file.relativePath);
  const unexpectedVideos = videos
    .filter((file) => file.relativePath !== expectedDronePath)
    .map((file) => file.relativePath);
  const walkthroughVideos = videos
    .filter(
      (file) =>
        file.relativePath.includes("人物完整跑图") ||
        file.sizeBytes >= 200 * 1024 * 1024,
    )
    .map((file) => file.relativePath);
  const oversizedFiles = files
    .filter((file) => file.sizeBytes > maximumSingleFileBytes)
    .map((file) => file.relativePath);
  const forbiddenDirectories = files
    .filter((file) =>
      /(^|\/)(node_modules|outputs|src|scripts|\.git|\.github)(\/|$)/.test(
        file.relativePath,
      ),
    )
    .map((file) => file.relativePath);
  const sourceFiles = files
    .filter((file) =>
      [".ts", ".tsx", ".mjs", ".cjs"].includes(file.extension),
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
  const pagesWorkflows = workflows.filter((workflow) => workflow.pagesWorkflow);
  const uploadSteps = workflows.reduce(
    (total, workflow) => total + workflow.uploadActionVersions.length,
    0,
  );
  const uploadPaths = workflows.flatMap((workflow) => workflow.uploadPaths);

  const failures = [];
  if (totalBytes > maximumBytes) {
    failures.push("Deployment cancelled: pages-dist exceeds 200 MiB");
  }
  if (oversizedFiles.length) {
    failures.push("pages-dist contains a file larger than 100 MiB.");
  }
  if (
    uploadPaths.length !== 1 ||
    !["./pages-dist", "pages-dist"].includes(uploadPaths[0])
  ) {
    failures.push(
      `Pages upload path must be ./pages-dist, found: ${uploadPaths.join(", ") || "none"}.`,
    );
  }
  if (uploadSteps !== 1 || pagesWorkflows.length !== 1) {
    failures.push(
      `Expected one Pages workflow/upload step, found ${pagesWorkflows.length}/${uploadSteps}.`,
    );
  }
  if (rawPngFiles.length) failures.push("pages-dist contains raw PNG files.");
  if (originalPortfolioImages.length) {
    failures.push("pages-dist contains original portfolio images.");
  }
  if (unexpectedVideos.length || walkthroughVideos.length) {
    failures.push("pages-dist contains an unexpected local video.");
  }
  if (forbiddenDirectories.length || sourceFiles.length || forbiddenFiles.length) {
    failures.push("pages-dist contains forbidden source or report files.");
  }
  if (missingMedia.length) {
    failures.push("Manifest references media missing from pages-dist.");
  }
  if (unreferencedMedia.length) {
    failures.push("pages-dist contains unreferenced media.");
  }
  if (
    prepareReport.manifestReferencedMediaCount !== manifestMedia.length ||
    prepareReport.copiedMediaCount !== deployedMedia.length ||
    prepareReport.missingCount !== 0
  ) {
    failures.push("Pages preparation counts do not match verification.");
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    rootCause: {
      conclusion:
        "GitHub Linux环境没有本地outputs目录中的Q92/无损优化报告。旧sync-media.mjs因此重新生成了指向public/portfolio原始PNG的manifest；prune-build-media.mjs随后按该manifest保留80张原图并删除响应式候选，最终得到534.93 MiB。prune并非路径删除失败，而是依据错误回退manifest执行了错误白名单。",
      cloudEvidence: {
        deploymentBytes: 534.93,
        files: 87,
        images: 80,
        imageMiB: 469.08,
        videoMiB: 65.38,
      },
      fix:
        "优化报告缺失时，sync-media现在验证并复用已提交的优化manifest，拒绝回退原图；Pages再从manifest白名单重建pages-dist。",
    },
    directories: {
      distBytes,
      pagesDistBytes: totalBytes,
      pagesDistFiles: files.length,
    },
    preparation: {
      manifestReferencedMediaCount: manifestMedia.length,
      copiedMediaCount: deployedMedia.length,
      missingCount: missingMedia.length,
      unreferencedCount: unreferencedMedia.length,
      report: prepareReport,
    },
    content: {
      imageCount: images.length,
      imageBytes,
      videoCount: videos.length,
      videoBytes,
      codeCount: codeFiles.length,
      codeBytes,
      rawPngCount: rawPngFiles.length,
      largestFiles,
      topLevelDirectories,
      deployedVideos: videos.map((file) => ({
        path: file.relativePath,
        sizeBytes: file.sizeBytes,
      })),
    },
    workflow: {
      uploadPaths,
      uploadStepCount: uploadSteps,
      pagesWorkflowCount: pagesWorkflows.length,
      files: workflows,
      maximumMiB: 200,
      maximumSingleFileMiB: 100,
    },
    validation: {
      passed: failures.length === 0,
      failures,
      missingMedia,
      unreferencedMedia,
      rawPngFiles,
      originalPortfolioImages,
      unexpectedVideos,
      walkthroughVideos,
      oversizedFiles,
      forbiddenDirectories,
      sourceFiles,
      forbiddenFiles,
    },
    modifiedFiles: [
      ".github/workflows/deploy.yml",
      ".gitignore",
      "package.json",
      "scripts/sync-media.mjs",
      "scripts/prepare-pages-dist.mjs",
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
    "# 西福寺 GitHub Pages 干净部署目录审计",
    "",
    `生成时间：${audit.generatedAt}`,
    "",
    "## 根因",
    "",
    `- ${audit.rootCause.conclusion}`,
    `- 修复：${audit.rootCause.fix}`,
    "",
    "## 结果",
    "",
    `- dist：${formatBytes(distBytes)}`,
    `- pages-dist：${formatBytes(totalBytes)}`,
    `- 文件：${files.length}`,
    `- manifest引用媒体：${manifestMedia.length}`,
    `- 成功复制媒体：${deployedMedia.length}`,
    `- 图片：${images.length}个 / ${formatBytes(imageBytes)}`,
    `- 视频：${videos.length}个 / ${formatBytes(videoBytes)}`,
    `- HTML/CSS/JS：${codeFiles.length}个 / ${formatBytes(codeBytes)}`,
    `- 原始PNG：${rawPngFiles.length}`,
    `- 缺失媒体：${missingMedia.length}`,
    `- 未引用媒体：${unreferencedMedia.length}`,
    `- 上传路径：${uploadPaths.join(", ")}`,
    `- 200 MiB门禁：${failures.length ? "失败" : "通过"}`,
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
  ].join("\n");
  await writeFile(markdownReportPath, markdown, "utf8");

  console.log(`dist: ${formatBytes(distBytes)} (${distBytes} bytes)`);
  console.log(`pages-dist: ${formatBytes(totalBytes)} (${totalBytes} bytes)`);
  console.log(`Files: ${files.length}`);
  console.log(`Images: ${images.length}, ${formatBytes(imageBytes)}`);
  console.log(`Videos: ${videos.length}, ${formatBytes(videoBytes)}`);
  console.log(`HTML/CSS/JS: ${codeFiles.length}, ${formatBytes(codeBytes)}`);
  console.log(`Manifest referenced media: ${manifestMedia.length}`);
  console.log(`Copied media: ${deployedMedia.length}`);
  console.log(`Raw PNG: ${rawPngFiles.length}`);
  console.log(`Missing media: ${missingMedia.length}`);
  console.log(`Unreferenced media: ${unreferencedMedia.length}`);
  console.log("Top-level pages-dist content:");
  for (const entry of topLevelDirectories) {
    console.log(
      `  ${entry.path}: ${formatBytes(entry.sizeBytes)}, ${entry.files} files`,
    );
  }
  console.log("Largest 30 pages-dist files:");
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
  console.log("Pages deployment verification passed: pages-dist is below 200 MiB.");
}

main().catch((error) => {
  console.error("Pages deployment verification failed.");
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
