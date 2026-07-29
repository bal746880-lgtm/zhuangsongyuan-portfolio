import type { CSSProperties } from "react";
import type { GalleryLayoutVariant } from "../../data/galleryLayouts";
import {
  GalleryMediaItem,
  type GalleryItem,
} from "./GalleryMediaItem";

interface EqualHeightMediaRowProps {
  items: readonly GalleryItem[];
  sectionId: string;
  layoutVariant?: GalleryLayoutVariant;
  maxMediaHeight?: string;
  showIndex?: boolean;
  enableLightbox?: boolean;
  className?: string;
}

type GalleryStyle = CSSProperties & {
  "--gallery-media-height": string;
};

export function EqualHeightMediaRow({
  items,
  sectionId,
  layoutVariant = "default",
  maxMediaHeight = "clamp(420px, 32vw, 650px)",
  showIndex = true,
  enableLightbox = true,
  className = "",
}: EqualHeightMediaRowProps) {
  const style: GalleryStyle = {
    "--gallery-media-height": maxMediaHeight,
  };

  return (
    <div
      className={`equal-height-media-row equal-height-media-row--${Math.min(
        items.length,
        5,
      )} ${className}`}
      id={sectionId}
      style={style}
    >
      {items.map((item, index) => (
        <GalleryMediaItem
          key={`${item.file.relativePath}-${item.file.name}`}
          item={item}
          items={items}
          index={index}
          variant={layoutVariant}
          enableLightbox={enableLightbox}
          showIndex={showIndex}
          mode="equal-row"
        />
      ))}
    </div>
  );
}
