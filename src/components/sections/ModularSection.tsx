import { propAiPipeline } from "../../data/aiAssetPipelines";
import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { FullWidthMediaStack } from "../media/FullWidthMediaStack";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { PipelineFlowBoard } from "../ui/PipelineFlowBoard";
import { SectionHeader } from "../ui/SectionHeader";

export function ModularSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);
  const propCollection =
    images.find(
      (image) =>
        image.sortValue === 4 &&
        (image.name.includes("道具") || image.name === "4.png"),
    ) ?? null;
  const modularImages = propCollection
    ? images.filter(
        (image) => image.relativePath !== propCollection.relativePath,
      )
    : images;
  const aiFolder = media?.children.find((folder) =>
    propAiPipeline.folderMatcher(folder.name),
  );
  const aiImages = imagesIn(aiFolder);

  return (
    <section className="content-section" id="modular">
      <SectionHeader
        index="07"
        eyebrow="MODULAR ARCHITECTURE"
        title="模块化建筑与道具"
        description={sectionCopy.modular}
      />
      {modularImages.length ? (
        <ConfiguredMediaGroup
          files={modularImages}
          config={galleryLayouts.modular}
          sectionId="modular-gallery"
          title="模块拆分、复用与场景组合"
          caption="保持原图完整比例，以连续横向节奏查看模块规划、资产细节与最终组合效果。"
          itemCaption="模块化建筑与环境道具制作记录。"
          altPrefix="模块化建筑与道具："
          className="large-horizontal-gallery modular-gallery"
        />
      ) : (
        <PlaceholderPanel label="模块素材待接入" detail="当前未读取到模块化建筑与道具图片。" />
      )}

      <div className="subsection ai-pipeline-subsection">
        <div className="subsection-heading">
          <p className="eyebrow">{propAiPipeline.eyebrow}</p>
          <h3>{propAiPipeline.title}</h3>
          <p>{propAiPipeline.subtitle}</p>
        </div>
        <PipelineFlowBoard
          steps={propAiPipeline.steps}
          description={propAiPipeline.boardDescription}
          ariaLabel="道具AI辅助资产管线流程"
        />
        {aiImages.length ? (
          <ConfiguredMediaGroup
            files={aiImages}
            config={galleryLayouts.propAiPipeline}
            sectionId="prop-ai-pipeline-gallery"
            itemTitle={(_file, index) =>
              propAiPipeline.media[index]?.title ?? `图 ${index + 1}`
            }
            itemEyebrow={(_file, index) =>
              propAiPipeline.media[index]?.english ?? ""
            }
            itemCaption={(_file, index) =>
              propAiPipeline.media[index]?.description ?? ""
            }
            itemStatus={(_file, index) =>
              propAiPipeline.media[index]?.status ?? ""
            }
            altPrefix="道具AI辅助资产管线："
            className="large-horizontal-gallery ai-pipeline-gallery"
          />
        ) : (
          <PlaceholderPanel
            label="道具AI辅助资产管线素材待接入"
            detail="当前未识别到道具AI流程文件夹中的图片。"
          />
        )}
      </div>

      {propCollection ? (
        <div className="subsection prop-collection-subsection">
          <div className="subsection-heading">
            <p className="eyebrow">AI-ASSISTED PROP ASSETS</p>
            <h3>以下道具均通过AI辅助资产管线完成落地</h3>
            <p>
              从参考分析、AI多视图与基础网格生成，到人工减面、UV重构、材质适配及UE场景验证，形成可复用的道具资产生产流程。
            </p>
          </div>
          <FullWidthMediaStack
            files={[propCollection]}
            sectionId="ai-assisted-prop-assets"
            altPrefix="AI辅助资产管线完成的道具合集："
            itemTitle={() => "道具资产合集"}
            itemCaption="多件石制环境道具与岩石资产的统一陈列。"
            className="prop-collection-media"
          />
        </div>
      ) : null}
    </section>
  );
}
