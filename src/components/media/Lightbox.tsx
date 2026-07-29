import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MediaFile } from "../../data/media";

interface LightboxState {
  items: MediaFile[];
  index: number;
}

interface LightboxContextValue {
  openLightbox: (items: MediaFile[], index: number) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export function useLightbox(): LightboxContextValue {
  const context = useContext(LightboxContext);
  if (!context) throw new Error("useLightbox must be used inside LightboxProvider");
  return context;
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState | null>(null);

  const close = useCallback(() => setState(null), []);
  const previous = useCallback(() => {
    setState((current) =>
      current
        ? {
            ...current,
            index: (current.index - 1 + current.items.length) % current.items.length,
          }
        : current,
    );
  }, []);
  const next = useCallback(() => {
    setState((current) =>
      current
        ? { ...current, index: (current.index + 1) % current.items.length }
        : current,
    );
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, next, previous, state]);

  const value = useMemo(
    () => ({
      openLightbox: (items: MediaFile[], index: number) =>
        setState({ items, index }),
    }),
    [],
  );

  const active = state?.items[state.index];

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
          <button
            className="lightbox__close"
            type="button"
            aria-label="关闭图片灯箱"
            onClick={close}
          >
            关闭
          </button>
          <button
            className="lightbox__nav lightbox__nav--previous"
            type="button"
            aria-label="查看上一张图片"
            onClick={previous}
          >
            ←
          </button>
          <figure className="lightbox__figure">
            <img
              src={active.src ?? active.url}
              alt={active.alt ?? active.name.replace(/\.[^.]+$/, "")}
              loading="lazy"
              decoding="async"
              fetchPriority="auto"
              width={active.width}
              height={active.height}
            />
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
