import type {
  GalleryLayoutConfig,
} from "../../data/galleryLayouts";
import type { MediaFile } from "../../data/media";
import { MediaGrid } from "./MediaGrid";
import {
  createGalleryItems,
} from "./GalleryMediaItem";
import { EqualHeightMediaRow } from "./EqualHeightMediaRow";
import { ScrollDrivenGallery } from "./ScrollDrivenGallery";
import { SingleMedia } from "./SingleMedia";

interface ConfiguredMediaGroupProps {
  files: readonly MediaFile[];
  config: GalleryLayoutConfig;
  sectionId: string;
  title?: string;
  caption?: string;
  itemCaption?: string | ((file: MediaFile, index: number) => string);
  itemTitle?: (file: MediaFile, index: number) => string;
  altPrefix: string;
  showIndex?: boolean;
  enableLightbox?: boolean;
  className?: string;
}

export function ConfiguredMediaGroup({
  files,
  config,
  sectionId,
  title = "",
  caption = "",
  itemCaption,
  itemTitle,
  altPrefix,
  showIndex = true,
  enableLightbox = true,
  className = "",
}: ConfiguredMediaGroupProps) {
  const items = createGalleryItems(files, {
    altPrefix,
    caption: itemCaption,
    title: itemTitle,
  });

  if (!items.length) return null;

  switch (config.layoutMode) {
    case "single":
      return (
        <SingleMedia
          item={items[0]}
          sectionId={sectionId}
          layoutVariant={config.layoutVariant}
          maxMediaHeight={config.maxMediaHeight}
          showIndex={showIndex}
          enableLightbox={enableLightbox}
          className={className}
        />
      );
    case "equal-row":
      return (
        <EqualHeightMediaRow
          items={items}
          sectionId={sectionId}
          layoutVariant={config.layoutVariant}
          maxMediaHeight={config.maxMediaHeight}
          showIndex={showIndex}
          enableLightbox={enableLightbox}
          className={className}
        />
      );
    case "horizontal":
      return (
        <ScrollDrivenGallery
          items={items}
          sectionId={sectionId}
          title={title}
          caption={caption}
          layoutVariant={config.layoutVariant}
          maxMediaHeight={config.maxMediaHeight}
          showIndex={showIndex}
          enableLightbox={enableLightbox}
          className={className}
        />
      );
    case "editorial-grid":
      return (
        <MediaGrid
          items={files}
          featureFirst
          altPrefix={altPrefix}
          className={className}
        />
      );
  }
}
