import { treeTrunkAiPipeline } from "../../data/aiAssetPipelines";
import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { vegetationSteps } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { PipelineFlowBoard } from "../ui/PipelineFlowBoard";
import { SectionHeader } from "../ui/SectionHeader";

function folderByNumber(media: MediaFolder | undefined, folderNumber: number) {
  return media?.children.find((folder) => folder.sortValue === folderNumber);
}

export function VegetationSection({ media }: { media?: MediaFolder }) {
  const ecosystemImages = imagesIn(folderByNumber(media, 0));
  const ecosystemShowcaseImages = ecosystemImages.slice(0, 3);
  const subsurfaceScatteringImages = ecosystemImages.slice(3, 6);
  const finalEffectImages = imagesIn(folderByNumber(media, 18));
  const visibleSteps = vegetationSteps;

  return (
    <section className="content-section vegetation-section" id="vegetation">
      <SectionHeader
        index="09"
        eyebrow={treeTrunkAiPipeline.eyebrow}
        title={treeTrunkAiPipeline.title}
        description={treeTrunkAiPipeline.subtitle}
      />

      <PipelineFlowBoard
        phases={treeTrunkAiPipeline.phases}
        description={treeTrunkAiPipeline.boardDescription}
        ariaLabel="植被AI辅助资产管线01至17步流程"
      />

      <div className="process-list">

        {visibleSteps.map((step) => {
          const stepImages = imagesIn(folderByNumber(media, step.stepNumber));
          const stepLayout = galleryLayouts.vegetationSteps[step.stepNumber];

          return (
            <article className="process-step" key={step.stepNumber}>
              <header className="process-step__header">
                <span className="process-step__number">
                  {String(step.stepNumber).padStart(2, "0")}
                </span>
                <div>
                  <p className="eyebrow">{step.english}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {"badge" in step && step.badge ? (
                    <span className="process-step__badge">{step.badge}</span>
                  ) : null}
                </div>
              </header>
              {stepImages.length ? (
                <ConfiguredMediaGroup
                  files={stepImages}
                  config={stepLayout}
                  sectionId={`vegetation-step-${step.stepNumber}-media`}
                  altPrefix={`植被流程 ${String(step.stepNumber).padStart(2, "0")} · ${step.title}：`}
                  itemCaption={`第 ${String(step.stepNumber).padStart(2, "0")} 步的过程与结果记录。`}
                  className={
                    step.stepNumber === 11
                      ? "leaf-normal-iteration-row"
                      : stepLayout.layoutMode === "horizontal"
                        ? "large-horizontal-gallery process-horizontal-gallery"
                        : ""
                  }
                />
              ) : (
                <PlaceholderPanel
                  label="过程素材待补充"
                  detail={`未在第 ${step.stepNumber} 步对应文件夹中读取到图片。`}
                />
              )}
            </article>
          );
        })}

        <article className="process-step vegetation-ecosystem-showcase">
          <header className="process-step__header">
            <span className="process-step__number" aria-hidden="true">—</span>
            <div>
              <p className="eyebrow">ECOSYSTEM SHOWCASE</p>
              <h3>生态系统展示</h3>
              <p>展示完整植被资产体系在UE5实时环境中的生态层次、树种变化、空间组合与整体场景表现。</p>
            </div>
          </header>
          {ecosystemShowcaseImages.length ? (
            <ConfiguredMediaGroup
              files={ecosystemShowcaseImages}
              config={galleryLayouts.vegetationEcosystem}
              sectionId="vegetation-ecosystem-gallery"
              altPrefix="植被生态系统展示："
              itemCaption="完整植被资产体系的生态层次与场景表现。"
              className="large-horizontal-gallery process-horizontal-gallery"
            />
          ) : (
            <PlaceholderPanel
              label="生态系统展示待补充"
              detail="当前未读取到生态系统展示图片。"
            />
          )}
        </article>

        <article className="process-step vegetation-subsurface-showcase">
          <header className="process-step__header">
            <span className="process-step__number" aria-hidden="true">—</span>
            <div>
              <p className="eyebrow">VEGETATION SUBSURFACE SCATTERING</p>
              <h3>植被次表面散射效果展示</h3>
              <p>集中展示枫树、银杏与竹类植被在逆光及侧逆光条件下的次表面散射表现，强化叶片的透光层次、色彩变化与真实受光效果。</p>
            </div>
          </header>
          {subsurfaceScatteringImages.length ? (
            <ConfiguredMediaGroup
              files={subsurfaceScatteringImages}
              config={galleryLayouts.vegetationEcosystem}
              sectionId="vegetation-subsurface-gallery"
              altPrefix="植被次表面散射效果："
              itemCaption="植被在逆光与侧逆光条件下的次表面散射表现。"
              className="large-horizontal-gallery process-horizontal-gallery"
            />
          ) : (
            <PlaceholderPanel
              label="植被次表面散射效果待补充"
              detail="当前未读取到植被次表面散射效果图片。"
            />
          )}
        </article>

        <article className="process-step vegetation-final-showcase">
          <header className="process-step__header">
            <span className="process-step__number">18</span>
            <div>
              <p className="eyebrow">FINAL EFFECT SHOWCASE</p>
              <h3>最终效果展示</h3>
            </div>
          </header>
          {finalEffectImages.length ? (
            <ConfiguredMediaGroup
              files={finalEffectImages}
              config={galleryLayouts.vegetationSteps[18]}
              sectionId="vegetation-final-effect-gallery"
              altPrefix="植被最终效果展示："
              itemCaption="植被资产最终效果。"
              className="large-horizontal-gallery process-horizontal-gallery"
            />
          ) : (
            <PlaceholderPanel
              label="最终效果展示待补充"
              detail="当前未读取到植被最终效果图片。"
            />
          )}
        </article>
      </div>
    </section>
  );
}