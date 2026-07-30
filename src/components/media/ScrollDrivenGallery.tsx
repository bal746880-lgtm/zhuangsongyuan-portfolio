import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { GalleryLayoutVariant } from "../../data/galleryLayouts";
import {
  GalleryMediaItem,
  type GalleryItem,
} from "./GalleryMediaItem";
import "./ScrollDrivenGallery.css";

interface ScrollDrivenGalleryProps {
  items: readonly GalleryItem[];
  sectionId: string;
  title: string;
  caption: string;
  layoutVariant?: GalleryLayoutVariant;
  maxMediaHeight?: string;
  showIndex?: boolean;
  enableLightbox?: boolean;
  className?: string;
}

interface GalleryGeometry {
  start: number;
  scrollDistance: number;
  maxTranslate: number;
}

type GalleryStyle = CSSProperties & {
  "--gallery-media-height": string;
};

const DESKTOP_QUERY = "(min-width: 1200px) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function ScrollDrivenGallery({
  items,
  sectionId,
  title,
  caption,
  layoutVariant = "default",
  maxMediaHeight = "clamp(540px, 72vh, 860px)",
  showIndex = true,
  enableLightbox = true,
  className = "",
}: ScrollDrivenGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const snapReleaseTimeoutRef = useRef<number | null>(null);
  const isSnapSuppressedRef = useRef(false);
  const geometryRef = useRef<GalleryGeometry>({
    start: 0,
    scrollDistance: 0,
    maxTranslate: 0,
  });
  const [isScrollDriven, setIsScrollDriven] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionActive, setIsSectionActive] = useState(false);

  const style: GalleryStyle = {
    "--gallery-media-height": maxMediaHeight,
  };

  const updateDesktopPosition = useCallback(() => {
    const track = trackRef.current;
    if (!track || !isScrollDriven) return;

    const { start, scrollDistance, maxTranslate } = geometryRef.current;
    const progress =
      scrollDistance > 0
        ? Math.min(1, Math.max(0, (window.scrollY - start) / scrollDistance))
        : 0;

    track.style.transform = `translate3d(${-progress * maxTranslate}px, 0, 0)`;
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${progress})`;
    }

    const nextIndex = Math.min(
      items.length - 1,
      Math.max(0, Math.round(progress * (items.length - 1))),
    );
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [isScrollDriven, items.length]);

  const scheduleDesktopUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateDesktopPosition();
    });
  }, [updateDesktopPosition]);

  const suppressSnapUntilScrollEnd = useCallback(() => {
    isSnapSuppressedRef.current = true;

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
    if (snapReleaseTimeoutRef.current !== null) {
      window.clearTimeout(snapReleaseTimeoutRef.current);
    }

    snapReleaseTimeoutRef.current = window.setTimeout(() => {
      isSnapSuppressedRef.current = false;
      snapReleaseTimeoutRef.current = null;
    }, 4000);
  }, []);

  const releaseSnapSuppression = useCallback(() => {
    if (!isSnapSuppressedRef.current) return;
    isSnapSuppressedRef.current = false;
    if (snapReleaseTimeoutRef.current !== null) {
      window.clearTimeout(snapReleaseTimeoutRef.current);
      snapReleaseTimeoutRef.current = null;
    }
  }, []);

  const scheduleDesktopSnap = useCallback(() => {
    if (
      !isScrollDriven ||
      items.length <= 1 ||
      isSnapSuppressedRef.current ||
      document.documentElement.dataset.anchorNavigation === "true"
    ) {
      return;
    }

    if (snapTimeoutRef.current !== null) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = window.setTimeout(() => {
      snapTimeoutRef.current = null;
      const { start, scrollDistance } = geometryRef.current;
      const localScroll = window.scrollY - start;

      if (
        scrollDistance <= 0 ||
        localScroll < 0 ||
        localScroll > scrollDistance
      ) {
        return;
      }

      const progress = localScroll / scrollDistance;
      const nearestIndex = Math.round(progress * (items.length - 1));
      const target =
        start + (nearestIndex / (items.length - 1)) * scrollDistance;

      if (Math.abs(window.scrollY - target) < 3) return;
      window.scrollTo({ top: target, behavior: "smooth" });
    }, 140);
  }, [isScrollDriven, items.length]);

  const handleDesktopScroll = useCallback(() => {
    scheduleDesktopUpdate();
    scheduleDesktopSnap();
  }, [scheduleDesktopSnap, scheduleDesktopUpdate]);

  const recalculate = useCallback(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!stage || !sticky || !track) return;

    if (!isScrollDriven) {
      stage.style.height = "";
      track.style.transform = "";
      geometryRef.current = {
        start: 0,
        scrollDistance: 0,
        maxTranslate: 0,
      };
      return;
    }

    const stickyTop = Number.parseFloat(window.getComputedStyle(sticky).top) || 0;
    const stickyHeight = sticky.clientHeight;
    const maxTranslate = Math.max(0, track.scrollWidth - sticky.clientWidth);
    const pixelsPerPanel = Math.min(
      280,
      Math.max(200, window.innerHeight * 0.22),
    );
    const scrollDistance =
      maxTranslate > 0 && items.length > 1
        ? pixelsPerPanel * (items.length - 1)
        : 0;
    const nextHeight = Math.ceil(stickyHeight + scrollDistance);

    if (stage.style.height !== `${nextHeight}px`) {
      stage.style.height = `${nextHeight}px`;
    }

    geometryRef.current = {
      start:
        stage.getBoundingClientRect().top + window.scrollY - stickyTop,
      scrollDistance,
      maxTranslate,
    };
    scheduleDesktopUpdate();
  }, [isScrollDriven, items.length, scheduleDesktopUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!("IntersectionObserver" in window)) {
      setIsSectionActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsSectionActive(true);
        observer.disconnect();
      },
      { rootMargin: "450px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateMode = () =>
      setIsScrollDriven(desktop.matches && !reducedMotion.matches);

    updateMode();
    desktop.addEventListener("change", updateMode);
    reducedMotion.addEventListener("change", updateMode);
    return () => {
      desktop.removeEventListener("change", updateMode);
      reducedMotion.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    const handleAnchorNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      suppressSnapUntilScrollEnd();
    };

    document.addEventListener("click", handleAnchorNavigation, true);
    window.addEventListener("hashchange", suppressSnapUntilScrollEnd);
    window.addEventListener("scrollend", releaseSnapSuppression);

    return () => {
      document.removeEventListener("click", handleAnchorNavigation, true);
      window.removeEventListener("hashchange", suppressSnapUntilScrollEnd);
      window.removeEventListener("scrollend", releaseSnapSuppression);
      if (snapReleaseTimeoutRef.current !== null) {
        window.clearTimeout(snapReleaseTimeoutRef.current);
        snapReleaseTimeoutRef.current = null;
      }
    };
  }, [releaseSnapSuppression, suppressSnapUntilScrollEnd]);

  useEffect(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!stage || !sticky || !track) return;

    const resizeObserver = new ResizeObserver(recalculate);
    resizeObserver.observe(sticky);
    resizeObserver.observe(track);
    window.addEventListener("resize", recalculate);
    stage.addEventListener("load", recalculate, true);

    if (isScrollDriven) {
      window.addEventListener("scroll", handleDesktopScroll, {
        passive: true,
      });
    }

    recalculate();
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalculate);
      window.removeEventListener("scroll", handleDesktopScroll);
      stage.removeEventListener("load", recalculate, true);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (snapTimeoutRef.current !== null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }
    };
  }, [handleDesktopScroll, isScrollDriven, recalculate]);

  const moveToIndex = (nextIndex: number) => {
    const clampedIndex = Math.min(
      items.length - 1,
      Math.max(0, nextIndex),
    );

    if (isScrollDriven) {
      suppressSnapUntilScrollEnd();
      const { start, scrollDistance } = geometryRef.current;
      const progress =
        items.length > 1 ? clampedIndex / (items.length - 1) : 0;
      window.scrollTo({
        top: start + progress * scrollDistance,
        behavior: "smooth",
      });
      return;
    }

    const panel = trackRef.current?.children[clampedIndex] as
      | HTMLElement
      | undefined;
    panel?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    setActiveIndex(clampedIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveToIndex(
      activeIndex + (event.key === "ArrowRight" ? 1 : -1),
    );
  };

  const handleNativeScroll = () => {
    if (isScrollDriven || animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const panels = Array.from(track.children) as HTMLElement[];
      const nextIndex = panels.reduce(
        (bestIndex, panel, index) =>
          Math.abs(panel.offsetLeft - track.scrollLeft) <
          Math.abs(panels[bestIndex].offsetLeft - track.scrollLeft)
            ? index
            : bestIndex,
        0,
      );
      setActiveIndex(nextIndex);
      if (progressRef.current) {
        const progress =
          items.length > 1 ? nextIndex / (items.length - 1) : 1;
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
    });
  };

  return (
    <div
      ref={containerRef}
      className={`scroll-driven-gallery ${
        isScrollDriven ? "scroll-driven-gallery--active" : ""
      } scroll-driven-gallery--${layoutVariant} ${className}`}
      id={sectionId}
      style={style}
    >
      {title || caption ? (
        <header className="scroll-driven-gallery__intro">
          {title ? <h3>{title}</h3> : null}
          {caption ? <p>{caption}</p> : null}
        </header>
      ) : null}

      <div className="scroll-driven-gallery__stage" ref={stageRef}>
        <div
          className="scroll-driven-gallery__sticky"
          ref={stickyRef}
          role="region"
          aria-label={title || "横向图片画廊"}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div
            className="scroll-driven-gallery__track"
            ref={trackRef}
            onScroll={handleNativeScroll}
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
                mode="horizontal"
                onMediaLoad={recalculate}
                shouldLoad={
                  isSectionActive && Math.abs(index - activeIndex) <= 1
                }
              />
            ))}
          </div>

          <div
            className="scroll-driven-gallery__progress"
            aria-label={`画廊进度 ${activeIndex + 1} / ${items.length}`}
          >
            <span className="scroll-driven-gallery__count">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </span>
            <i aria-hidden="true">
              <span ref={progressRef} />
            </i>
          </div>
        </div>
      </div>
    </div>
  );
}
