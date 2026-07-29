import {
  type ImgHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import type { MediaFile } from "../../data/media";

interface ResponsiveImageProps
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src" | "srcSet" | "sizes" | "width" | "height" | "loading"
  > {
  file: MediaFile;
  eager?: boolean;
  forceActive?: boolean;
  observeViewport?: boolean;
  sourceOverride?: string;
  widthOverride?: number;
  heightOverride?: number;
}

export function ResponsiveImage({
  file,
  eager = false,
  forceActive = false,
  observeViewport = true,
  sourceOverride,
  widthOverride,
  heightOverride,
  ...imageProps
}: ResponsiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isActive, setIsActive] = useState(eager || forceActive);

  useEffect(() => {
    if (eager || forceActive) setIsActive(true);
  }, [eager, forceActive]);

  useEffect(() => {
    if (isActive || eager || forceActive || !observeViewport) return;
    const image = imageRef.current;
    if (!image) return;

    if (!("IntersectionObserver" in window)) {
      setIsActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsActive(true);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [eager, forceActive, isActive, observeViewport]);

  const activeSource = sourceOverride ?? file.src ?? file.url;
  const useResponsiveSources = !sourceOverride;

  return (
    <img
      {...imageProps}
      ref={imageRef}
      src={isActive ? activeSource : undefined}
      srcSet={isActive && useResponsiveSources ? file.srcSet : undefined}
      sizes={isActive && useResponsiveSources ? file.sizes : undefined}
      width={widthOverride ?? file.width}
      height={heightOverride ?? file.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      data-media-active={isActive ? "true" : "false"}
    />
  );
}
