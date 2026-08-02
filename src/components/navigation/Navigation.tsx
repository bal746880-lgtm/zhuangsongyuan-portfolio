import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useState,
} from "react";
import { useActiveSection } from "../../hooks/useActiveSection";

export const navItems = [
  { id: "hero", label: "首页" },
  { id: "about", label: "关于我" },
  { id: "stills", label: "作品展示" },
  { id: "drone", label: "视频" },
  { id: "overview", label: "项目概览" },
  { id: "layout", label: "规划" },
  { id: "modular", label: "模块" },
  { id: "materials", label: "材质" },
  { id: "vegetation", label: "植被" },
  { id: "pcg", label: "PCG" },
  { id: "contact", label: "联系" },
] as const;

let anchorNavigationRelease: number | null = null;
let anchorAlignmentRetry: number | null = null;

function activateSectionsThrough(target: HTMLElement) {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(".content-section"),
  );

  for (const section of sections) {
    section.classList.add("content-section--anchor-visible");
    if (section === target || section.contains(target)) break;
  }
}

function scrollToSection(id: string, updateHistory: boolean) {
  const target = document.getElementById(id);
  if (!target) return;

  const root = document.documentElement;
  root.dataset.anchorNavigation = "true";
  if (anchorNavigationRelease !== null) {
    window.clearTimeout(anchorNavigationRelease);
  }
  if (anchorAlignmentRetry !== null) {
    window.clearTimeout(anchorAlignmentRetry);
  }

  activateSectionsThrough(target);
  if (updateHistory) {
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", nextHash);
    }
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const alignTarget = () => {
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        target.scrollIntoView({
          block: "start",
          behavior: "auto",
        });
        window.requestAnimationFrame(() => {
          root.style.scrollBehavior = previousScrollBehavior;
        });
      };

      alignTarget();
      anchorAlignmentRetry = window.setTimeout(() => {
        alignTarget();
        anchorAlignmentRetry = null;
      }, 400);
      anchorNavigationRelease = window.setTimeout(() => {
        delete root.dataset.anchorNavigation;
        anchorNavigationRelease = null;
      }, 5000);
    });
  });
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const ids = navItems.map((item) => item.id);
  const activeSection = useActiveSection(ids);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const initialId = decodeURIComponent(window.location.hash.slice(1));
    if (!navItems.some((item) => item.id === initialId)) return;
    scrollToSection(initialId, false);
  }, []);

  const handleNavigation = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    setIsOpen(false);
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    scrollToSection(id, true);
  };

  return (
    <nav
      className={`navigation ${isScrolled ? "navigation--scrolled" : ""}`}
      aria-label="作品集章节导航"
    >
      <a
        className="navigation__brand"
        href="#hero"
        onClick={(event) => handleNavigation(event, "hero")}
      >
        <span>XIFO</span>
        <small>PORTFOLIO</small>
      </a>
      <button
        className="navigation__toggle"
        type="button"
        aria-label={isOpen ? "关闭章节菜单" : "打开章节菜单"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "关闭" : "菜单"}
      </button>
      <div className={`navigation__links ${isOpen ? "navigation__links--open" : ""}`}>
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={activeSection === item.id ? "location" : undefined}
            onClick={(event) => handleNavigation(event, item.id)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
