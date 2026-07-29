import type { CSSProperties } from "react";
import type { GalleryLayoutVariant } from "../../data/galleryLayouts";
import {
  GalleryMediaItem,
  type GalleryItem,
} from "./GalleryMediaItem";

interface SingleMediaProps {
  item: GalleryItem;
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

export function SingleMedia({
  item,
  sectionId,
  layoutVariant = "default",
  maxMediaHeight = "clamp(520px, 68vh, 820px)",
  showIndex = true,
  enableLightbox = true,
  className = "",
}: SingleMediaProps) {
  const style: GalleryStyle = {
    "--gallery-media-height": maxMediaHeight,
  };

  return (
    <div
      className={`single-media ${className}`}
      id={sectionId}
      style={style}
    >
      <GalleryMediaItem
        item={item}
        items={[item]}
        index={0}
        variant={layoutVariant}
        enableLightbox={enableLightbox}
        showIndex={showIndex}
        mode="single"
      />
    </div>
  );
}
