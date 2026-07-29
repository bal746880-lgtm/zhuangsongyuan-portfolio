import type { MediaFile } from "../../data/media";
import { imageTitle } from "../../utils/mediaHelpers";
import { sortByLeadingNumber } from "../../utils/mediaSort";
import { useLightbox } from "./Lightbox";

interface MediaGridProps {
  items: readonly MediaFile[];
  className?: string;
  featureFirst?: boolean;
  dense?: boolean;
  captions?: boolean;
  altPrefix: string;
}

export function MediaGrid({
  items,
  className = "",
  featureFirst = false,
  dense = false,
  captions = true,
  altPrefix,
}: MediaGridProps) {
  const images = sortByLeadingNumber(items.filter((item) => item.kind === "image"));
  const { openLightbox } = useLightbox();

  if (images.length === 0) return null;

  const classes = [
    "media-grid",
    featureFirst ? "media-grid--feature-first" : "",
    dense ? "media-grid--dense" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {images.map((image, index) => (
        <figure className="media-card" key={`${image.relativePath}-${image.name}`}>
          <button
            className="media-card__button"
            type="button"
            aria-label={`放大查看：${altPrefix}${imageTitle(image, index)}`}
            onClick={() => openLightbox(images, index)}
          >
            <img
              src={image.src ?? image.url}
              alt={`${altPrefix}${imageTitle(image, index)}`}
              loading="lazy"
              decoding="async"
              fetchPriority="auto"
              width={image.width}
              height={image.height}
            />
          </button>
          {captions ? (
            <figcaption>
              <span>{imageTitle(image, index)}</span>
              <span className="media-card__number">
                {String(index + 1).padStart(2, "0")}
              </span>
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
