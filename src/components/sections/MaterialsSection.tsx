import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { sortByLeadingNumber } from "../../utils/mediaSort";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { FullWidthMediaStack } from "../media/FullWidthMediaStack";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

interface MaterialsSectionProps {
  media?: MediaFolder;
  nodeMedia?: MediaFolder;
}

export function MaterialsSection({
  media,
  nodeMedia,
}: MaterialsSectionProps) {
  const nodeGraphs = sortByLeadingNumber(imagesIn(nodeMedia));
  const materialResults = sortByLeadingNumber(imagesIn(media));

  return (
    <section className="content-section materials-section" id="materials">
      <SectionHeader
        index="08"
        eyebrow="PROCEDURAL MATERIALS"
        title="程序化材质与场景应用"
        description={sectionCopy.materials}
      />

      {materialResults.length ? (
        <div className="subsection">
          <div className="subsection-heading">
            <p className="eyebrow">MATERIAL & APPLICATION</p>
            <h3>材质展示与场景应用</h3>
          </div>
          <FullWidthMediaStack
            files={materialResults}
            sectionId="materials-result-gallery"
            altPrefix="程序化材质展示："
            itemCaption="程序化材质结果与场景实际应用。"
          />
        </div>
      ) : null}

      {nodeGraphs.length ? (
        <div className="subsection materials-section__nodes">
          <div className="subsection-heading">
            <p className="eyebrow">SD GRAPH & PROCESS</p>
            <h3>Substance Designer 节点与制作过程</h3>
            <p>节点图保留完整界面和原始比例，点击图片可放大查看。</p>
          </div>
          <ConfiguredMediaGroup
            files={nodeGraphs}
            config={galleryLayouts.materialNodes}
            sectionId="materials-sd-gallery"
            title=""
            caption=""
            altPrefix="Substance Designer 节点图："
            itemCaption="Substance Designer 节点与制作过程。"
            className="large-horizontal-gallery large-horizontal-gallery--wide"
          />
        </div>
      ) : (
        <PlaceholderPanel
          label="SD 节点图待补充"
          detail="“SD节点展示”文件夹中未读取到节点截图。"
        />
      )}
    </section>
  );
}
