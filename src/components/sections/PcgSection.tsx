import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { pcgLabels, sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { SectionHeader } from "../ui/SectionHeader";

export function PcgSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);
  const processImages = images.filter(
    (image) => image.sortValue !== null && image.sortValue <= 6,
  );
  const assetFolder = media?.children.find((folder) => folder.sortValue === 7);
  const resultFolder = media?.children.find((folder) => folder.sortValue === 8);
  const assetImages = imagesIn(assetFolder);
  const resultImages = imagesIn(resultFolder);

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

      {assetImages.length ? (
        <div className="subsection">
          <div className="subsection-heading">
            <p className="eyebrow">MOSS ASSET PRODUCTION</p>
            <h3>苔藓资产制作流程</h3>
            <p>
              以游戏参考约束苔藓的形态方向，通过AI生成基础模型，再经Marmoset
              Toolbag高低模烘焙与UE5材质制作，形成可用于岩石表面散布的苔藓资产。
            </p>
          </div>
          <ConfiguredMediaGroup
            files={assetImages}
            config={galleryLayouts.pcgProcess}
            sectionId="pcg-asset-production-gallery"
            title=""
            caption=""
            altPrefix="苔藓资产制作流程："
            itemCaption="苔藓资产制作过程。"
          />
        </div>
      ) : null}

      {resultImages.length ? (
        <div className="subsection">
          <div className="subsection-heading">
            <p className="eyebrow">FINAL PCG SCENE APPLICATION</p>
            <h3>岩石苔藓PCG最终场景应用</h3>
            <p>
              展示苔藓资产与岩石PCG系统在不同区域、坡度和光照条件下的最终落地效果，验证程序化散布与人工调整结合后的场景表现。
            </p>
          </div>
          <ConfiguredMediaGroup
            files={resultImages}
            config={galleryLayouts.pcgResults}
            sectionId="pcg-result-gallery"
            title=""
            caption=""
            altPrefix="岩石苔藓 PCG 最终效果："
            itemCaption="岩石苔藓PCG最终场景应用。"
          />
        </div>
      ) : null}
    </section>
  );
}
