import { useEffect, useState } from "react";
import { useActiveSection } from "../../hooks/useActiveSection";

export const navItems = [
  { id: "hero", label: "首页" },
  { id: "about", label: "关于我" },
  { id: "stills", label: "作品展示" },
  { id: "overview", label: "项目概览" },
  { id: "layout", label: "规划" },
  { id: "modular", label: "模块" },
  { id: "materials", label: "材质" },
  { id: "vegetation", label: "植被" },
  { id: "pcg", label: "PCG" },
  { id: "walkthrough", label: "跑图" },
  { id: "contact", label: "联系" },
] as const;

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

  return (
    <nav
      className={`navigation ${isScrolled ? "navigation--scrolled" : ""}`}
      aria-label="作品集章节导航"
    >
      <a className="navigation__brand" href="#hero" onClick={() => setIsOpen(false)}>
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
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
