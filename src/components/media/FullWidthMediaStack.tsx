import type { MediaFile } from "../../data/media";
import {
  createGalleryItems,
  GalleryMediaItem,
} from "./GalleryMediaItem";
import "./gallery.css";

interface FullWidthMediaStackProps {
  files: readonly MediaFile[];
  sectionId: string;
  altPrefix: string;
  itemCaption?: string | ((file: MediaFile, index: number) => string);
  itemTitle?: (file: MediaFile, index: number) => string;
  className?: string;
}

export function FullWidthMediaStack({
  files,
  sectionId,
  altPrefix,
  itemCaption,
  itemTitle,
  className = "",
}: FullWidthMediaStackProps) {
  const items = createGalleryItems(files, {
    altPrefix,
    caption: itemCaption,
    title: itemTitle,
  });

  if (!items.length) return null;

  return (
    <div className={`full-width-media-stack ${className}`} id={sectionId}>
      {items.map((item, index) => (
        <GalleryMediaItem
          key={`${item.file.relativePath}-${item.file.name}`}
          item={item}
          items={items}
          index={index}
          variant="cinematic"
          enableLightbox
          showIndex
          mode="single"
        />
      ))}
    </div>
  );
}
