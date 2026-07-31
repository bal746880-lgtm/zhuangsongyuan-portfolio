import { useLayoutEffect } from "react";

interface RevealOptions {
  delay?: number;
  distance?: number;
  duration?: number;
  fadeOnly?: boolean;
  timeline?: boolean;
}

interface RevealRule extends RevealOptions {
  selector: string;
  stagger?: number;
  staggerMax?: number;
  exclude?: (target: HTMLElement) => boolean;
}

const DEFAULT_DURATION = 540;
const DEFAULT_DISTANCE = 20;

const revealRules: readonly RevealRule[] = [
  { selector: ".navigation", duration: 520, fadeOnly: true },
  {
    selector: ".hero-section__image, .hero-section__fallback",
    duration: 700,
    fadeOnly: true,
  },
  {
    selector: ".hero-section__scroll",
    delay: 140,
    duration: 520,
    distance: 12,
  },

  {
    selector:
      ".section-header__index, .section-header__copy > .eyebrow, .subsection-heading > .eyebrow",
    delay: 0,
  },
  {
    selector: ".section-header__title-line, .subsection-heading > h3",
    delay: 60,
  },
  {
    selector:
      ".section-header__description, .subsection-heading > p:last-child:not(.eyebrow)",
    delay: 120,
  },

  { selector: ".about-experience__portrait", distance: 24, duration: 560 },
  { selector: ".about-experience__role", delay: 70 },
  {
    selector: ".about-experience__bio > p",
    delay: 160,
    stagger: 60,
    staggerMax: 60,
  },
  {
    selector: ".about-experience__facts > div",
    stagger: 70,
    staggerMax: 210,
  },
  { selector: ".about-experience__capabilities", delay: 120 },
  {
    selector: ".career-timeline",
    timeline: true,
    duration: 600,
    fadeOnly: true,
  },

  {
    selector: ".overview-copy > p, .fact-grid > div",
    stagger: 70,
    staggerMax: 210,
  },
  {
    selector:
      ".overview-lists > div > .eyebrow, .contact-layout > div:first-child > .eyebrow",
    delay: 0,
  },
  {
    selector:
      ".overview-lists > div > h3, .contact-layout > div:first-child > h3",
    delay: 60,
  },
  {
    selector:
      ".responsibility-grid > li, .software-list > li, .contact-responsibilities > li",
    delay: 120,
    stagger: 70,
    staggerMax: 330,
  },

  {
    selector: ".vegetation-process-intro > .eyebrow",
    delay: 0,
  },
  {
    selector: ".vegetation-process-intro > h3",
    delay: 60,
  },
  {
    selector: ".vegetation-process-intro > p:last-child",
    delay: 120,
  },
  { selector: ".process-step__number", delay: 0 },
  { selector: ".process-step__header .eyebrow", delay: 60 },
  { selector: ".process-step__header h3", delay: 120 },
  { selector: ".process-step__header p:not(.eyebrow)", delay: 180 },
  { selector: ".process-step__badge", delay: 220 },
  { selector: ".pipeline-flow-board", duration: 520, fadeOnly: true },

  {
    selector: ".gallery-media-item",
    distance: 24,
    duration: 560,
    stagger: 70,
    staggerMax: 350,
    exclude: (target) => Boolean(target.closest(".scroll-driven-gallery")),
  },
  {
    selector: ".media-card",
    distance: 24,
    duration: 560,
    stagger: 70,
    staggerMax: 350,
  },
  {
    selector: ".video-frame",
    distance: 24,
    duration: 560,
    stagger: 70,
    staggerMax: 210,
  },
  {
    selector: ".scroll-driven-gallery",
    duration: 560,
    fadeOnly: true,
  },

  {
    selector: ".pcg-labels > span",
    stagger: 70,
    staggerMax: 350,
  },
  { selector: ".placeholder-panel", distance: 24 },
  { selector: ".billboard-note__heading", delay: 0 },
  { selector: ".billboard-note > .prose > p", delay: 160, stagger: 60 },

  { selector: ".contact-panel__intro", delay: 0 },
  {
    selector: ".contact-item",
    delay: 70,
    stagger: 70,
    staggerMax: 210,
  },
  {
    selector: ".site-footer > div",
    stagger: 70,
    staggerMax: 140,
  },
];

function siblingIndex(target: HTMLElement, selector: string): number {
  const parent = target.parentElement;
  if (!parent) return 0;

  return Array.from(parent.children)
    .filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement)
    .filter((sibling) => sibling.matches(selector))
    .indexOf(target);
}

function prepareTarget(
  target: HTMLElement,
  rule: RevealRule,
): RevealOptions {
  const index = Math.max(0, siblingIndex(target, rule.selector));
  const staggerDelay = rule.stagger
    ? Math.min(index * rule.stagger, rule.staggerMax ?? 350)
    : 0;
  const options: RevealOptions = {
    delay: Math.min((rule.delay ?? 0) + staggerDelay, 350),
    distance: rule.distance ?? DEFAULT_DISTANCE,
    duration: rule.duration ?? DEFAULT_DURATION,
    fadeOnly: rule.fadeOnly,
    timeline: rule.timeline,
  };

  target.classList.add("reveal-on-scroll");
  if (options.fadeOnly) target.classList.add("reveal-on-scroll--fade");
  if (options.timeline) target.classList.add("reveal-on-scroll--timeline");

  target.style.setProperty("--reveal-delay", `${options.delay}ms`);
  target.style.setProperty("--reveal-distance", `${options.distance}px`);
  target.style.setProperty("--reveal-duration", `${options.duration}ms`);

  return options;
}

export function useRevealOnScroll(enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled) return;

    const targets = new Map<HTMLElement, RevealOptions>();

    revealRules.forEach((rule) => {
      document.querySelectorAll<HTMLElement>(rule.selector).forEach((target) => {
        if (
          targets.has(target) ||
          target.closest(".lightbox") ||
          rule.exclude?.(target)
        ) {
          return;
        }

        targets.set(target, prepareTarget(target, rule));
      });
    });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      targets.forEach((_options, target) => {
        target.classList.add("is-revealed");
      });
      return;
    }

    const transitionEndHandlers = new Map<
      HTMLElement,
      (event: TransitionEvent) => void
    >();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          const options = targets.get(target);
          if (!options) return;

          if (!options.timeline) {
            const handleTransitionEnd = (event: TransitionEvent) => {
              if (event.target !== target || event.propertyName !== "opacity") {
                return;
              }
              target.classList.remove("reveal-on-scroll--animating");
              target.removeEventListener("transitionend", handleTransitionEnd);
              transitionEndHandlers.delete(target);
            };

            transitionEndHandlers.set(target, handleTransitionEnd);
            target.addEventListener("transitionend", handleTransitionEnd);
            target.classList.add("reveal-on-scroll--animating");
          }

          target.classList.add("is-revealed");
          observer.unobserve(target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08,
      },
    );

    targets.forEach((_options, target) => observer.observe(target));

    return () => {
      observer.disconnect();
      transitionEndHandlers.forEach((handler, target) => {
        target.removeEventListener("transitionend", handler);
      });
    };
  }, [enabled]);
}
