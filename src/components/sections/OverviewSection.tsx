import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import {
  overviewParagraphs,
  projectFacts,
  responsibilities,
  software,
} from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { SectionHeader } from "../ui/SectionHeader";

export function OverviewSection({ media }: { media?: MediaFolder }) {
  const references = imagesIn(media);

  return (
    <section className="content-section overview-section" id="overview">
      <SectionHeader
        index="05"
        eyebrow="PROJECT OVERVIEW"
        title="项目概览与个人职责"
      />

      <div className="overview-intro">
        <div className="overview-copy">
          {overviewParagraphs.map((paragraph) => (
            <p key={paragraph.lead}>
              <strong>{paragraph.lead}</strong>
              <span>{paragraph.body}</span>
            </p>
          ))}
        </div>
        <dl className="fact-grid">
          {projectFacts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {references.length ? (
        <div className="reference-block">
          <div className="subsection-heading">
            <p className="eyebrow">CONCEPT REFERENCES</p>
            <h3>概念参考</h3>
            <p>两张图片用于场景关系、空间层次与秋季氛围参考。</p>
          </div>
          <ConfiguredMediaGroup
            files={references}
            config={galleryLayouts.overviewReferences}
            sectionId="overview-concept-references"
            altPrefix="西福寺项目概念参考："
            itemCaption="概念原画中的空间关系、层次与氛围参考。"
          />
        </div>
      ) : null}

      <div className="overview-lists">
        <div>
          <p className="eyebrow">RESPONSIBILITIES</p>
          <h3>主要职责</h3>
          <ul className="responsibility-grid">
            {responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">SOFTWARE</p>
          <h3>使用软件</h3>
          <ul className="software-list">
            {software.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
