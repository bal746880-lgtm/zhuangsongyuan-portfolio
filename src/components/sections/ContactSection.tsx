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
          <div className="contact-ai-capability">
            <p className="eyebrow">SELF-DEVELOPED AI-ASSISTED ASSET PIPELINE</p>
            <h4>自研AI辅助资产管线落地</h4>
            <p>
              独立设计并落地AI辅助资产生产流程，将实景参考分析、AI多视图生成、基础模型生成、Blender网格清理与减面、RizomUV重构、ZBrush雕刻、高低模烘焙及UE场景适配进行串联，并实际应用于《西福寺》的道具与植被树干资产制作。
            </p>
            <ul aria-label="AI辅助资产管线能力">
              <li>AI辅助资产管线</li>
              <li>AI多视图生成</li>
              <li>网格清理与减面</li>
              <li>UV重构</li>
              <li>雕刻与烘焙</li>
              <li>UE场景适配</li>
            </ul>
          </div>
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
