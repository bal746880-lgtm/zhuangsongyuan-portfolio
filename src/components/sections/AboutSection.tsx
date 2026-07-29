import {
  aboutParagraphs,
  awards,
  careerPath,
  profileFacts,
} from "../../data/experience";
import type { MediaFolder } from "../../data/media";
import { imagesIn } from "../../utils/mediaHelpers";
import { CareerTimeline } from "../about/CareerTimeline";
import { ResponsiveImage } from "../media/ResponsiveImage";
import { SectionHeader } from "../ui/SectionHeader";
import "../about/AboutExperience.css";

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

        <div className="about-experience__overview">
          <aside className="about-experience__visual">
            <figure
              className={`about-experience__portrait ${
                portrait ? "about-experience__portrait--image" : ""
              }`}
            >
              {portrait ? (
                <ResponsiveImage
                  file={portrait}
                  alt="庄松源个人照片"
                />
              ) : (
                <div className="about-experience__portrait-placeholder">
                  <span>PORTRAIT</span>
                  <small>个人照片</small>
                </div>
              )}
            </figure>

            <div className="about-experience__role">
              <strong>游戏地编 · 环境美术</strong>
              <span>Level Artist · Environment Artist</span>
            </div>
          </aside>

          <div className="about-experience__profile">
            <div className="about-experience__bio">
              {aboutParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
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
        </div>

        <CareerTimeline entries={careerPath} awards={awards} />
      </div>
    </section>
  );
}
