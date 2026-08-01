import { useEffect } from "react";

const PROTECTED_MEDIA_SELECTOR = "img, picture, video, canvas";

function protectedMediaFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(PROTECTED_MEDIA_SELECTOR);
}

function disableNativeDragging(root: ParentNode): void {
  root
    .querySelectorAll<HTMLElement>(PROTECTED_MEDIA_SELECTOR)
    .forEach((element) => {
      element.draggable = false;
    });
}

export function useMediaProtection(): void {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      if (protectedMediaFromTarget(event.target)) event.preventDefault();
    };
    const handleDragStart = (event: DragEvent) => {
      if (protectedMediaFromTarget(event.target)) event.preventDefault();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
      }
    };

    disableNativeDragging(document);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(PROTECTED_MEDIA_SELECTOR)) node.draggable = false;
          disableNativeDragging(node);
        });
      });
    });

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
      mutationObserver.disconnect();
    };
  }, []);
}
