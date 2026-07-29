import { useRef, useState } from "react";
import { responsibilities } from "../../data/portfolio";
import { copyText } from "../../utils/mediaHelpers";
import { SectionHeader } from "../ui/SectionHeader";

const contactItems = [
  { label: "姓名", value: "庄松源", href: undefined, copyable: false },
  {
    label: "微信",
    value: "18371378303",
    href: undefined,
    copyable: true,
  },
  {
    label: "电话",
    value: "18371378303",
    href: "tel:18371378303",
    copyable: true,
  },
  {
    label: "邮箱",
    value: "1815258404@qq.com",
    href: "mailto:1815258404@qq.com",
    copyable: true,
  },
] as const;

export function ContactSection() {
  const [copied, setCopied] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleCopy = async (label: string, value: string) => {
    await copyText(value);
    setCopied(`${label}已复制`);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <section className="content-section contact-section" id="contact">
      <SectionHeader index="13" eyebrow="CONTACT" title="项目职责与联系方式" />

      <div className="contact-layout">
        <div>
          <p className="eyebrow">PROJECT RESPONSIBILITIES</p>
          <h3>个人全流程制作</h3>
          <ul className="contact-responsibilities">
            {responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="contact-panel">
          <p className="contact-panel__intro">
            期待参与更完整、更高质量的游戏环境制作。
          </p>
          <div className="contact-list">
            {contactItems.map((item) => (
              <div className="contact-item" key={item.label}>
                <span>{item.label}</span>
                {item.href ? (
                  <a href={item.href}>{item.value}</a>
                ) : (
                  <strong>{item.value}</strong>
                )}
                {item.copyable ? (
                  <button
                    type="button"
                    aria-label={`复制${item.label}：${item.value}`}
                    onClick={() => void handleCopy(item.label, item.value)}
                  >
                    复制
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <p className="copy-feedback" role="status" aria-live="polite">
            {copied ?? "\u00A0"}
          </p>
        </div>
      </div>

      <footer className="site-footer">
        <div>
          <strong>庄松源 · 西福寺 / XIFO TEMPLE</strong>
          <span>游戏地编 · 环境美术</span>
        </div>
        <div>
          <span>Level Artist · Environment Artist</span>
          <span>Personal Project · Full Pipeline</span>
        </div>
      </footer>
    </section>
  );
}
