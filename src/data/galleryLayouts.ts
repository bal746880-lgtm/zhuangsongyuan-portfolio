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
  vegetationSceneGallery: {
    layoutMode: "horizontal",
    layoutVariant: "cinematic",
    maxMediaHeight: "clamp(520px, 68vh, 820px)",
  },
  vegetationAssets: {
    layoutMode: "equal-row",
    layoutVariant: "technical",
    maxMediaHeight: "clamp(420px, 32vw, 650px)",
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
    1: {
      layoutMode: "equal-row",
      layoutVariant: "reference",
      maxMediaHeight: "clamp(420px, 32vw, 650px)",
    },
    2: {
      layoutMode: "equal-row",
      layoutVariant: "reference",
      maxMediaHeight: "clamp(320px, 28vw, 520px)",
    },
    3: {
      layoutMode: "equal-row",
      layoutVariant: "technical",
      maxMediaHeight: "clamp(420px, 32vw, 650px)",
    },
    4: {
      layoutMode: "equal-row",
      layoutVariant: "process",
      maxMediaHeight: "clamp(320px, 28vw, 520px)",
    },
    5: {
      layoutMode: "horizontal",
      layoutVariant: "process",
      maxMediaHeight: "clamp(520px, 68vh, 820px)",
    },
    6: {
      layoutMode: "equal-row",
      layoutVariant: "technical",
      maxMediaHeight: "clamp(420px, 32vw, 650px)",
    },
    7: {
      layoutMode: "single",
      layoutVariant: "technical",
      maxMediaHeight: "clamp(480px, 62vh, 760px)",
    },
    8: {
      layoutMode: "equal-row",
      layoutVariant: "process",
      maxMediaHeight: "clamp(320px, 28vw, 520px)",
    },
  },
} as const satisfies Record<string, unknown>;
