import {
  type CSSProperties,
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
  scrollRange: number;
  maxTranslate: number;
  isValid: boolean;
}

interface GalleryMeasurement {
  stickyWidth: number;
  stickyHeight: number;
  trackWidth: number;
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
  const resizeFrameRef = useRef<number | null>(null);
  const lastTranslateRef = useRef<number | null>(null);
  const lastProgressRef = useRef<number | null>(null);
  const lastMeasurementRef = useRef<GalleryMeasurement | null>(null);
  const geometryRef = useRef<GalleryGeometry>({
    start: 0,
    scrollRange: 0,
    maxTranslate: 0,
    isValid: false,
  });
  const [isScrollDriven, setIsScrollDriven] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionActive, setIsSectionActive] = useState(false);

  const style: GalleryStyle = {
    "--gallery-media-height": maxMediaHeight,
  };

  const resetDesktopPosition = useCallback(() => {
    const track = trackRef.current;
    if (track && lastTranslateRef.current !== 0) {
      track.style.transform = "translate3d(0px, 0, 0)";
    }
    if (progressRef.current && lastProgressRef.current !== 0) {
      progressRef.current.style.transform = "scaleX(0)";
    }
    lastTranslateRef.current = 0;
    lastProgressRef.current = 0;
    setActiveIndex((current) => (current === 0 ? current : 0));
  }, []);

  const updateDesktopPosition = useCallback(() => {
    const track = trackRef.current;
    if (!track || !isScrollDriven) return;

    const { start, scrollRange, maxTranslate, isValid } = geometryRef.current;
    if (
      !isValid ||
      !Number.isFinite(start) ||
      !Number.isFinite(scrollRange) ||
      !Number.isFinite(maxTranslate) ||
      scrollRange <= 0 ||
      maxTranslate <= 0
    ) {
      resetDesktopPosition();
      return;
    }

    const pageScrollY = Number.isFinite(window.scrollY) ? window.scrollY : 0;
    const localScroll = pageScrollY - start;
    const rawProgress = localScroll / scrollRange;
    const progress = Number.isFinite(rawProgress)
      ? Math.min(1, Math.max(0, rawProgress))
      : 0;
    const nextTranslate = -progress * maxTranslate;

    if (
      lastTranslateRef.current === null ||
      progress === 0 ||
      progress === 1 ||
      Math.abs(nextTranslate - lastTranslateRef.current) >= 0.5
    ) {
      track.style.transform = `translate3d(${nextTranslate}px, 0, 0)`;
      lastTranslateRef.current = nextTranslate;
    }
    if (
      progressRef.current &&
      (lastProgressRef.current === null ||
        progress === 0 ||
        progress === 1 ||
        Math.abs(progress - lastProgressRef.current) >= 0.0005)
    ) {
      progressRef.current.style.transform = `scaleX(${progress})`;
      lastProgressRef.current = progress;
    }

    const nextIndex = Math.min(
      items.length - 1,
      Math.max(0, Math.round(progress * (items.length - 1))),
    );
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [isScrollDriven, items.length, resetDesktopPosition]);

  const scheduleDesktopUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateDesktopPosition();
    });
  }, [updateDesktopPosition]);

  const handleDesktopScroll = useCallback(() => {
    scheduleDesktopUpdate();
  }, [scheduleDesktopUpdate]);

  const recalculate = useCallback(() => {
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!stage || !sticky || !track) return;

    if (!isScrollDriven) {
      stage.style.height = "";
      lastMeasurementRef.current = null;
      geometryRef.current = {
        start: 0,
        scrollRange: 0,
        maxTranslate: 0,
        isValid: false,
      };
      resetDesktopPosition();
      track.style.transform = "";
      lastTranslateRef.current = null;
      return;
    }

    const parsedStickyTop = Number.parseFloat(
      window.getComputedStyle(sticky).top,
    );
    const stickyTop = Number.isFinite(parsedStickyTop) ? parsedStickyTop : 0;
    const measuredStickyHeight = sticky.clientHeight;
    const stickyHeight =
      measuredStickyHeight > 0
        ? measuredStickyHeight
        : Math.max(0, window.innerHeight - stickyTop);
    const stickyWidth = sticky.clientWidth;
    const trackWidth = track.scrollWidth;
    const stageTopInViewport = stage.getBoundingClientRect().top;
    const pageScrollY = Number.isFinite(window.scrollY) ? window.scrollY : 0;
    if (isSectionActive) {
      lastMeasurementRef.current = {
        stickyWidth,
        stickyHeight: measuredStickyHeight,
        trackWidth,
      };
    }
    const pixelsPerPanel = Math.min(
      280,
      Math.max(200, window.innerHeight * 0.22),
    );
    const plannedScrollRange =
      items.length > 1 ? pixelsPerPanel * (items.length - 1) : 0;
    const nextHeight = Math.ceil(stickyHeight + plannedScrollRange);

    if (Number.isFinite(nextHeight) && stage.style.height !== `${nextHeight}px`) {
      stage.style.height = `${nextHeight}px`;
    }

    const maxTranslate = Math.max(0, trackWidth - stickyWidth);
    const hasValidDimensions =
      stickyWidth > 0 &&
      stickyHeight > 0 &&
      trackWidth > 0 &&
      Number.isFinite(stageTopInViewport) &&
      Number.isFinite(maxTranslate) &&
      Number.isFinite(plannedScrollRange);
    const hasHorizontalOverflow = maxTranslate > 0;
    const scrollRange =
      hasValidDimensions && hasHorizontalOverflow ? plannedScrollRange : 0;
    const absoluteStageTop = pageScrollY + stageTopInViewport;
    const start = absoluteStageTop - stickyTop;
    const isValid =
      isSectionActive &&
      hasValidDimensions &&
      Number.isFinite(start) &&
      scrollRange > 0;

    geometryRef.current = {
      start: isValid ? start : 0,
      scrollRange,
      maxTranslate,
      isValid,
    };
    if (isValid) scheduleDesktopUpdate();
    else resetDesktopPosition();
  }, [
    isScrollDriven,
    isSectionActive,
    items.length,
    resetDesktopPosition,
    scheduleDesktopUpdate,
  ]);

  const scheduleRecalculate = useCallback(() => {
    if (resizeFrameRef.current !== null) return;
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      recalculate();
    });
  }, [recalculate]);

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
    const stage = stageRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!stage || !sticky || !track) return;

    window.addEventListener("resize", scheduleRecalculate);
    let resizeObserver: ResizeObserver | null = null;

    if (isScrollDriven) {
      window.addEventListener("scroll", handleDesktopScroll, {
        passive: true,
      });
    }

    if (
      isScrollDriven &&
      isSectionActive &&
      "ResizeObserver" in window
    ) {
      lastMeasurementRef.current = {
        stickyWidth: sticky.clientWidth,
        stickyHeight: sticky.clientHeight,
        trackWidth: track.scrollWidth,
      };
      resizeObserver = new ResizeObserver(() => {
        const previous = lastMeasurementRef.current;
        const nextMeasurement: GalleryMeasurement = {
          stickyWidth: sticky.clientWidth,
          stickyHeight: sticky.clientHeight,
          trackWidth: track.scrollWidth,
        };
        const changed =
          !previous ||
          Math.abs(nextMeasurement.stickyWidth - previous.stickyWidth) > 1 ||
          Math.abs(nextMeasurement.stickyHeight - previous.stickyHeight) > 1 ||
          Math.abs(nextMeasurement.trackWidth - previous.trackWidth) > 1;
        if (!changed) return;
        lastMeasurementRef.current = nextMeasurement;
        scheduleRecalculate();
      });
      resizeObserver.observe(sticky);
      resizeObserver.observe(track);
    }

    recalculate();
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleRecalculate);
      window.removeEventListener("scroll", handleDesktopScroll);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [
    handleDesktopScroll,
    isScrollDriven,
    isSectionActive,
    recalculate,
    scheduleRecalculate,
  ]);

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
