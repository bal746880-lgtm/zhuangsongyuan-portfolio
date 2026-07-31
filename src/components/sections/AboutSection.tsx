import {
  aboutParagraphs,
  awards,
  careerPath,
  coreCapabilities,
  profileFacts,
} from "../../data/experience";
import type { MediaFolder } from "../../data/media";
import { imagesIn } from "../../utils/mediaHelpers";
import { CareerTimeline } from "../about/CareerTimeline";
import { ResponsiveImage } from "../media/ResponsiveImage";
import { SectionHeader } from "../ui/SectionHeader";
import "../about/AboutExperience.css";

const aboutHighlights = new Set([
  "西安理工大学视觉传达专业",
  "AI睡眠领域硬科技创业团队",
  "用户研究、内容运营、产品视觉与跨职能项目推进",
  "2025年重新明确长期职业方向",
  "游戏地编与实时环境制作",
  "UE5全流程环境项目《西福寺》",
  "游戏地编与环境美术",
]);

const aboutHighlightPattern = new RegExp(
  `(${[...aboutHighlights]
    .sort((left, right) => right.length - left.length)
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "g",
);

function emphasizeAboutParagraph(paragraph: string) {
  return paragraph.split(aboutHighlightPattern).map((part, index) =>
    aboutHighlights.has(part) ? (
      <strong key={`${part}-${index}`}>{part}</strong>
    ) : (
      part
    ),
  );
}

export function AboutSection({ media }: { media?: MediaFolder }) {
  const portrait = imagesIn(media)[0];

  return (
    <section className="content-section about-experience" id="about">
      <div className="about-experience__inner">
        <SectionHeader
          index="02"
          eyebrow="ABOUT & EXPERIENCE"
          title="个人介绍与经历"
          description="从视觉设计与硬科技创业实践，转向游戏地编与实时环境制作。"
        />

        <div className="about-experience__top">
          <figure
            className={`about-experience__portrait ${
              portrait ? "about-experience__portrait--image" : ""
            }`}
          >
            {portrait ? (
              <ResponsiveImage
                file={portrait}
                alt="庄松源个人照片"
                activationMargin="100px 0px"
              />
            ) : (
              <div className="about-experience__portrait-placeholder">
                <span>PORTRAIT</span>
                <small>个人照片</small>
              </div>
            )}
          </figure>

          <div className="about-experience__profile">
            <div className="about-experience__bio">
              {aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{emphasizeAboutParagraph(paragraph)}</p>
              ))}
            </div>

            <dl className="about-experience__facts">
              {profileFacts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="about-experience__role">
            <strong>游戏地编 · 环境美术</strong>
            <span>Level Artist · Environment Artist</span>
          </div>
        </div>

        <section
          className="about-experience__capabilities"
          aria-labelledby="about-core-capabilities"
        >
          <header className="about-experience__capabilities-heading">
            <h3 id="about-core-capabilities">核心能力</h3>
            <p>CORE CAPABILITIES</p>
          </header>
          <ol>
            {coreCapabilities.map((capability, index) => (
              <li
                key={capability.title}
                className={
                  index === 0
                    ? "about-experience__capability--featured"
                    : undefined
                }
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{capability.title}</strong>
                  <small>{capability.english}</small>
                  {"description" in capability ? (
                    <p>{capability.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <CareerTimeline entries={careerPath} awards={awards} />
      </div>
    </section>
  );
}
