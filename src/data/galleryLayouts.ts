export type GalleryLayoutMode =
  | "single"
  | "equal-row"
  | "horizontal"
  | "editorial-grid";

export type GalleryLayoutVariant =
  | "default"
  | "reference"
  | "technical"
  | "process"
  | "cinematic";

export interface GalleryLayoutConfig {
  layoutMode: GalleryLayoutMode;
  layoutVariant: GalleryLayoutVariant;
  maxMediaHeight?: string;
}

export const galleryLayouts = {
  overviewReferences: {
    layoutMode: "equal-row",
    layoutVariant: "reference",
    maxMediaHeight: "clamp(420px, 32vw, 650px)",
  },
  planning: {
    layoutMode: "single",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },
  modular: {
    layoutMode: "horizontal",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(540px, 72vh, 860px)",
  },
  propAiPipeline: {
    layoutMode: "horizontal",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(520px, 68vh, 800px)",
  },
  propCollection: {
    layoutMode: "single",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },
  selectedStills: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },
  materialNodes: {
    layoutMode: "horizontal",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(540px, 72vh, 860px)",
  },
  vegetationEcosystem: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },  vegetationSceneGallery: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },
  vegetationAssets: {
    layoutMode: "equal-row",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(420px, 32vw, 650px)",
  },
  treeTrunkAiPipeline: {
    layoutMode: "horizontal",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(520px, 68vh, 800px)",
  },
  pcgProcess: {
    layoutMode: "horizontal",
    layoutVariant: "process",
    maxMediaHeight: "clamp(540px, 72vh, 820px)",
  },
  pcgResults: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(540px, 72vh, 860px)",
  },
  environmentStills: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(540px, 72vh, 860px)",
  },
  vegetationSteps: {
    1: { layoutMode: "single", layoutVariant: "reference", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
    2: { layoutMode: "horizontal", layoutVariant: "reference", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    3: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    4: { layoutMode: "horizontal", layoutVariant: "process", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
    5: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    6: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    7: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    8: { layoutMode: "equal-row", layoutVariant: "reference", maxMediaHeight: "clamp(420px, 32vw, 650px)" },
    9: { layoutMode: "horizontal", layoutVariant: "reference", maxMediaHeight: "clamp(520px, 68vh, 800px)" },
    10: { layoutMode: "equal-row", layoutVariant: "technical", maxMediaHeight: "clamp(420px, 32vw, 650px)" },
    11: { layoutMode: "equal-row", layoutVariant: "process", maxMediaHeight: "clamp(320px, 28vw, 520px)" },
    12: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
    13: { layoutMode: "equal-row", layoutVariant: "technical", maxMediaHeight: "clamp(420px, 32vw, 650px)" },
    14: { layoutMode: "horizontal", layoutVariant: "process", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
    15: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(480px, 62vh, 760px)" },
    16: { layoutMode: "equal-row", layoutVariant: "process", maxMediaHeight: "clamp(420px, 32vw, 650px)" },
    17: { layoutMode: "single", layoutVariant: "technical", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
    18: { layoutMode: "horizontal", layoutVariant: "cinematic", maxMediaHeight: "clamp(520px, 68vh, 820px)" },
  },
} as const satisfies Record<string, unknown>;
