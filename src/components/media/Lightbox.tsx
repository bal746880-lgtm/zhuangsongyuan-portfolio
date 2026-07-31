import {
  createContext,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MediaFile } from "../../data/media";
import { ResponsiveImage } from "./ResponsiveImage";

interface LightboxState {
  items: MediaFile[];
  index: number;
}

interface LightboxContextValue {
  openLightbox: (items: MediaFile[], index: number) => void;
}

interface LightboxView {
  scale: number;
  x: number;
  y: number;
}

interface DragOrigin {
  pointerX: number;
  pointerY: number;
  panX: number;
  panY: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.2;
const INITIAL_VIEW: LightboxView = { scale: 1, x: 0, y: 0 };

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const context = useContext(LightboxContext);
  if (!context) throw new Error("useLightbox must be used inside LightboxProvider");
  return context;
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState | null>(null);
  const [view, setView] = useState<LightboxView>(INITIAL_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<LightboxView>(INITIAL_VIEW);
  const activeRef = useRef<MediaFile | undefined>(undefined);
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dragFrameRef = useRef<number | null>(null);

  const active = state?.items[state.index];
  activeRef.current = active;

  const commitView = useCallback((next: LightboxView) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const getPanBounds = useCallback((scale: number) => {
    const viewport = viewportRef.current;
    const file = activeRef.current;
    if (!viewport || !file) return { x: 0, y: 0 };

    const image = viewport.querySelector("img");
    const intrinsicWidth =
      image?.naturalWidth || file.lightboxWidth || file.width || 1;
    const intrinsicHeight =
      image?.naturalHeight || file.lightboxHeight || file.height || 1;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const fit = Math.min(
      viewportWidth / intrinsicWidth,
      viewportHeight / intrinsicHeight,
    );
    const renderedWidth = intrinsicWidth * fit * scale;
    const renderedHeight = intrinsicHeight * fit * scale;

    return {
      x: Math.max(0, (renderedWidth - viewportWidth) / 2),
      y: Math.max(0, (renderedHeight - viewportHeight) / 2),
    };
  }, []);

  const constrainView = useCallback(
    (next: LightboxView): LightboxView => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
      if (scale === MIN_SCALE) return INITIAL_VIEW;
      const bounds = getPanBounds(scale);
      return {
        scale,
        x: Math.min(bounds.x, Math.max(-bounds.x, next.x)),
        y: Math.min(bounds.y, Math.max(-bounds.y, next.y)),
      };
    },
    [getPanBounds],
  );

  const resetView = useCallback(() => {
    dragOriginRef.current = null;
    pendingPointerRef.current = null;
    setIsDragging(false);
    commitView(INITIAL_VIEW);
  }, [commitView]);

  const zoomTo = useCallback(
    (requestedScale: number, clientX?: number, clientY?: number) => {
      const current = viewRef.current;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, requestedScale),
      );
      if (nextScale === current.scale) return;
      if (nextScale === MIN_SCALE) {
        resetView();
        return;
      }

      const viewport = viewportRef.current;
      const rect = viewport?.getBoundingClientRect();
      const originX =
        rect && clientX !== undefined
          ? clientX - (rect.left + rect.width / 2)
          : 0;
      const originY =
        rect && clientY !== undefined
          ? clientY - (rect.top + rect.height / 2)
          : 0;
      const ratio = nextScale / current.scale;

      commitView(
        constrainView({
          scale: nextScale,
          x: originX - (originX - current.x) * ratio,
          y: originY - (originY - current.y) * ratio,
        }),
      );
    },
    [commitView, constrainView, resetView],
  );

  const close = useCallback(() => {
    resetView();
    setState(null);
  }, [resetView]);

  const previous = useCallback(() => {
    resetView();
    setState((current) =>
      current
        ? {
            ...current,
            index: (current.index - 1 + current.items.length) % current.items.length,
          }
        : current,
    );
  }, [resetView]);

  const next = useCallback(() => {
    resetView();
    setState((current) =>
      current
        ? { ...current, index: (current.index + 1) % current.items.length }
        : current,
    );
  }, [resetView]);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      zoomTo(
        viewRef.current.scale + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP),
        event.clientX,
        event.clientY,
      );
    },
    [zoomTo],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragOriginRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragOriginRef.current = null;
      pendingPointerRef.current = null;
      setIsDragging(false);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || viewRef.current.scale <= MIN_SCALE) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragOriginRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        panX: viewRef.current.x,
        panY: viewRef.current.y,
      };
      setIsDragging(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragOriginRef.current) return;
      pendingPointerRef.current = { x: event.clientX, y: event.clientY };
      if (dragFrameRef.current !== null) return;

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const origin = dragOriginRef.current;
        const pending = pendingPointerRef.current;
        if (!origin || !pending) return;
        commitView(
          constrainView({
            scale: viewRef.current.scale,
            x: origin.panX + pending.x - origin.pointerX,
            y: origin.panY + pending.y - origin.pointerY,
          }),
        );
      });
    },
    [commitView, constrainView],
  );

  useEffect(
    () => () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    },
    [],
  );

  const isOpen = Boolean(state);
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") previous();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomTo(viewRef.current.scale + ZOOM_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        zoomTo(viewRef.current.scale - ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    };

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen, next, previous, resetView, zoomTo]);

  const value = useMemo(
    () => ({
      openLightbox: (items: MediaFile[], index: number) => {
        resetView();
        setState({ items, index });
      },
    }),
    [resetView],
  );

  return (
    <LightboxContext.Provider value={value}>
      {children}
      {state && active ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="图片灯箱"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <div className="lightbox__controls" aria-label="图片缩放控制">
            <button
              type="button"
              aria-label="缩小图片"
              onClick={() => zoomTo(viewRef.current.scale - ZOOM_STEP)}
              disabled={view.scale <= MIN_SCALE}
            >
              −
            </button>
            <output aria-live="polite">{Math.round(view.scale * 100)}%</output>
            <button
              type="button"
              aria-label="放大图片"
              onClick={() => zoomTo(viewRef.current.scale + ZOOM_STEP)}
              disabled={view.scale >= MAX_SCALE}
            >
              ＋
            </button>
            <button type="button" onClick={resetView} disabled={view.scale === 1}>
              还原
            </button>
            <button type="button" onClick={close}>
              关闭
            </button>
          </div>
          <button
            className="lightbox__nav lightbox__nav--previous"
            type="button"
            aria-label="查看上一张图片"
            onClick={previous}
          >
            ←
          </button>
          <figure className="lightbox__figure">
            <div
              ref={viewportRef}
              className={`lightbox__viewport${
                view.scale > 1 ? " lightbox__viewport--zoomed" : ""
              }${isDragging ? " lightbox__viewport--dragging" : ""}`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onDoubleClick={(event) => {
                if (viewRef.current.scale > 1) resetView();
                else zoomTo(2, event.clientX, event.clientY);
              }}
            >
              <div
                className="lightbox__image-transform"
                style={{
                  transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                }}
              >
                <ResponsiveImage
                  key={`${active.relativePath}-${active.lightboxSrc ?? active.src}`}
                  file={active}
                  sourceOverride={active.lightboxSrc ?? active.src ?? active.url}
                  widthOverride={active.lightboxWidth ?? active.width}
                  heightOverride={active.lightboxHeight ?? active.height}
                  alt={active.alt ?? active.name.replace(/\.[^.]+$/, "")}
                  forceActive
                  observeViewport={false}
                  draggable={false}
                />
              </div>
            </div>
            <figcaption>
              <span>{active.name}</span>
              <span>
                {state.index + 1} / {state.items.length}
              </span>
            </figcaption>
          </figure>
          <button
            className="lightbox__nav lightbox__nav--next"
            type="button"
            aria-label="查看下一张图片"
            onClick={next}
          >
            →
          </button>
        </div>
      ) : null}
    </LightboxContext.Provider>
  );
}
