import type { MediaFile } from "../../data/media";
import type { GalleryLayoutVariant } from "../../data/galleryLayouts";
import { imageTitle } from "../../utils/mediaHelpers";
import { sortByLeadingNumber } from "../../utils/mediaSort";
import { useLightbox } from "./Lightbox";

export interface GalleryItem {
  file: MediaFile;
  src: string;
  alt: string;
  title: string;
  caption: string;
  order: number;
  type: "image" | "video";
  poster?: string;
  aspectRatio?: number;
}

interface CreateGalleryItemsOptions {
  altPrefix: string;
  caption?: string | ((file: MediaFile, index: number) => string);
  title?: (file: MediaFile, index: number) => string;
}

export function createGalleryItems(
  files: readonly MediaFile[],
  options: CreateGalleryItemsOptions,
): GalleryItem[] {
  const sorted = sortByLeadingNumber(
    files.filter((file) => file.kind === "image" || file.kind === "video"),
  );

  return sorted.map((file, index) => {
    const title = options.title?.(file, index) ?? imageTitle(file, index);
    const caption =
      typeof options.caption === "function"
        ? options.caption(file, index)
        : (options.caption ?? "");

    return {
      file,
      src: file.url,
      alt: `${options.altPrefix}${title}`,
      title,
      caption,
      order: file.sortValue ?? index + 1,
      type: file.kind === "video" ? "video" : "image",
    };
  });
}

interface GalleryMediaItemProps {
  item: GalleryItem;
  items: readonly GalleryItem[];
  index: number;
  variant: GalleryLayoutVariant;
  enableLightbox: boolean;
  showIndex: boolean;
  mode: "single" | "equal-row" | "horizontal";
  onMediaLoad?: () => void;
}

export function GalleryMediaItem({
  item,
  items,
  index,
  variant,
  enableLightbox,
  showIndex,
  mode,
  onMediaLoad,
}: GalleryMediaItemProps) {
  const { openLightbox } = useLightbox();
  const lightboxItems = items
    .filter((candidate) => candidate.type === "image")
    .map((candidate) => candidate.file);
  const lightboxIndex = items
    .filter((candidate) => candidate.type === "image")
    .findIndex((candidate) => candidate === item);

  const media = (
    <>
      {item.type === "video" ? (
        <video
          src={item.src}
          poster={item.poster}
          controls
          preload="metadata"
          onLoadedMetadata={onMediaLoad}
        />
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          onLoad={onMediaLoad}
        />
      )}
    </>
  );

  return (
    <figure
      className={`gallery-media-item gallery-media-item--${mode} gallery-media-item--${variant}`}
      data-gallery-index={index}
    >
      {item.type === "image" && enableLightbox ? (
        <button
          className="gallery-media-item__frame"
          type="button"
          aria-label={`放大查看：${item.alt}`}
          onClick={() => openLightbox(lightboxItems, lightboxIndex)}
        >
          {media}
        </button>
      ) : (
        <div className="gallery-media-item__frame">{media}</div>
      )}
      <figcaption>
        <div>
          <p className="gallery-media-item__title">{item.title}</p>
          <p className="gallery-media-item__caption">
            {item.caption || "\u00A0"}
          </p>
        </div>
        {showIndex ? (
          <span className="gallery-media-item__order">
            {String(item.order).padStart(2, "0")}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
