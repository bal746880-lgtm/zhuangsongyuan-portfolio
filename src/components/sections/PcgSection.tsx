import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { pcgLabels, sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function PcgSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);
  const processImages = images.filter(
    (image) => image.sortValue !== null && image.sortValue <= 6,
  );
  const resultImages = images.filter(
    (image) => image.sortValue !== null && image.sortValue > 6,
  );

  return (
    <section className="content-section pcg-section" id="pcg">
      <SectionHeader
        index="10"
        eyebrow="MOSS PCG SYSTEM"
        title="岩石苔藓 PCG 系统"
        description={sectionCopy.pcg}
      />

      <div className="pcg-labels" aria-label="岩石苔藓PCG流程标签">
        {pcgLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {processImages.length ? (
        <div className="subsection">
          <div className="subsection-heading">
            <p className="eyebrow">PROCESS RECORDS</p>
            <h3>生成与过滤过程</h3>
            <p>距离衰减与法线/坡度过滤属于不同阶段，页面不将两者合并描述。</p>
          </div>
          <ConfiguredMediaGroup
            files={processImages}
            config={galleryLayouts.pcgProcess}
            sectionId="pcg-process-gallery"
            title=""
            caption=""
            altPrefix="岩石苔藓 PCG 过程："
            itemCaption="岩石表面苔藓的生成、衰减与过滤过程。"
          />
        </div>
      ) : null}

      {resultImages.length ? (
        <div className="subsection">
          <div className="subsection-heading">
            <p className="eyebrow">FINAL RESULT</p>
            <h3>苔藓生成与场景应用</h3>
          </div>
          <ConfiguredMediaGroup
            files={resultImages}
            config={galleryLayouts.pcgResults}
            sectionId="pcg-result-gallery"
            title=""
            caption=""
            altPrefix="岩石苔藓 PCG 最终效果："
            itemCaption="PCG生成结果与场景应用效果。"
          />
        </div>
      ) : (
        <PlaceholderPanel label="最终效果待补充" detail="当前未读取到 PCG 最终场景图片。" />
      )}
    </section>
  );
}
