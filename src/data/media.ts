export type MediaKind = "image" | "video" | "text" | "other";

export interface MediaFile {
  name: string;
  relativePath: string;
  url: string;
  src: string;
  extension: string;
  kind: MediaKind;
  sortValue: number | null;
  sizeBytes: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  alt?: string;
  originalPath: string;
  optimizedPath: string | null;
  optimizedFormat: "png" | "webp" | null;
}

export interface MediaFolder {
  name: string;
  relativePath: string;
  sortValue: number | null;
  files: MediaFile[];
  children: MediaFolder[];
}

export interface PortfolioManifest {
  generatedAt: string;
  chapters: Record<string, MediaFolder>;
  missingChapters: string[];
}

export const chapterFolderNames = {
  hero: "主视觉封面",
  selectedStills: "最强静帧",
  drone: "无人机",
  overview: "项目概览与个人职责",
  layout: "规划与跑图路线",
  modular: "模块化建筑与道具",
  materials: "程序化材质与场景应用",
  vegetation: "植被全流程与Billboard制作",
  pcg: "岩石苔藓PCG系统",
  environmentStills: "场景静帧",
  walkthrough: "人物完整跑图",
  contact: "项目职责与联系方式",
  profile: "个人简介",
  sdNodes: "SD节点展示",
} as const;

export function getChapter(
  manifest: PortfolioManifest,
  folderName: string,
): MediaFolder | undefined {
  return manifest.chapters[folderName];
}
