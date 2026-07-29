import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { vegetationSteps } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { sortByLeadingNumber } from "../../utils/mediaSort";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { FullWidthMediaStack } from "../media/FullWidthMediaStack";
import { MediaGrid } from "../media/MediaGrid";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function VegetationSection({ media }: { media?: MediaFolder }) {
  const rootImages = imagesIn(media);
  const assetShowcase = rootImages.filter(
    (image) => image.sortValue !== null && image.sortValue <= 2,
  );
  const sceneShowcase = rootImages.filter(
    (image) =>
      image.sortValue !== null &&
      image.sortValue > 2 &&
      image.sortValue !== 7,
  );
  const sceneHero = sceneShowcase[1] ?? sceneShowcase[0];
  const sceneGallery = sceneShowcase.filter(
    (image) => image.relativePath !== sceneHero?.relativePath,
  );
  const sceneOrder = new Map(
    sceneShowcase.map((image, index) => [image.relativePath, index + 1]),
  );
  const billboardImage = rootImages.find((image) => image.sortValue === 7);
  const processFolders = sortByLeadingNumber(media?.children ?? []);

  return (
    <section className="content-section vegetation-section" id="vegetation">
      <SectionHeader
        index="09"
        eyebrow="VEGETATION ASSET PIPELINE"
        title="植被资产全流程"
        description="从真实形态观察到实时场景落地，按 8 个制作步骤递归展示现有素材。"
      />

      <div className="subsection">
        <div className="subsection-heading">
          <p className="eyebrow">IN-ENGINE RESULT</p>
          <h3>最终场景中的植被</h3>
        </div>
        {sceneHero ? (
          <>
            <FullWidthMediaStack
              files={[sceneHero]}
              sectionId="vegetation-scene-feature"
              altPrefix="植被最终场景："
              itemTitle={() => "图 02"}
              itemCaption="植被资产在最终环境中的层次与受光表现。"
            />
            {sceneGallery.length ? (
              <ConfiguredMediaGroup
                files={sceneGallery}
                config={galleryLayouts.vegetationSceneGallery}
                sectionId="vegetation-scene-gallery"
                altPrefix="植被最终场景："
                itemTitle={(file) =>
                  `图 ${String(sceneOrder.get(file.relativePath) ?? 0).padStart(
                    2,
                    "0",
                  )}`
                }
                itemCaption="植被资产在最终环境中的层次与受光表现。"
                className="large-horizontal-gallery vegetation-scene__gallery"
              />
            ) : null}
          </>
        ) : (
          <PlaceholderPanel label="场景展示待补充" detail="当前未识别到植被最终场景图片。" />
        )}
      </div>

      <div className="subsection">
        <div className="subsection-heading">
          <p className="eyebrow">ASSET SHOWCASE</p>
          <h3>植被资产陈列</h3>
        </div>
        {assetShowcase.length ? (
          <ConfiguredMediaGroup
            files={assetShowcase}
            config={galleryLayouts.vegetationAssets}
            sectionId="vegetation-asset-row"
            altPrefix="植被资产陈列："
            itemCaption="植被资产单独陈列与细节检查。"
          />
        ) : (
          <PlaceholderPanel label="资产展示待补充" detail="当前未识别到植被资产陈列图。" />
        )}
      </div>

      <header className="vegetation-process-intro">
        <p className="eyebrow">VEGETATION PRODUCTION PIPELINE</p>
        <h3>植被全流程制作过程展示</h3>
        <p>
          从枝干形态研究、资产制作、贴图与风动，到法线处理与UE最终表现。
        </p>
      </header>

      <div className="process-list">
        {vegetationSteps.map((step) => {
          const folder = processFolders.find(
            (candidate) => candidate.sortValue === step.number,
          );
          const allStepImages = imagesIn(folder);
          const stepImages =
            step.number === 8 ? allStepImages.slice(0, 2) : allStepImages;
          const stepLayout = galleryLayouts.vegetationSteps[step.number];

          return (
            <article className="process-step" key={step.number}>
              <header className="process-step__header">
                <span className="process-step__number">
                  {String(step.number).padStart(2, "0")}
                </span>
                <div>
                  <p className="eyebrow">PIPELINE STEP</p>
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
                  sectionId={`vegetation-step-${step.number}-media`}
                  altPrefix={`植被流程 ${String(step.number).padStart(2, "0")}：`}
                  itemCaption={`第 ${step.number} 步的过程与结果记录。`}
                  className={
                    stepLayout.layoutMode === "horizontal"
                      ? "large-horizontal-gallery process-horizontal-gallery"
                      : ""
                  }
                />
              ) : (
                <PlaceholderPanel
                  label="过程素材待补充"
                  detail={`未在第 ${step.number} 步文件夹中读取到图片。`}
                />
              )}
            </article>
          );
        })}
      </div>

      <aside className="billboard-note">
        <div className="billboard-note__heading">
          <p className="eyebrow">BILLBOARD PIPELINE</p>
          <h3>Billboard 制作流程</h3>
        </div>
        {billboardImage ? (
          <MediaGrid
            items={[billboardImage]}
            captions={false}
            altPrefix="Billboard 制作流程："
            className="billboard-note__media"
          />
        ) : (
          <PlaceholderPanel
            label="Billboard 流程图"
            detail="植被文件夹中未读取到编号 7 的图片。"
          />
        )}
        <div className="prose">
          <p>
            Billboard以SpeedTree完整三维植被为基础，通过Depth Preview检查树冠体积和内部层次；随后在Blender中将烘焙法线写入Vertex
            Color的RGB通道，并将AO写入A通道。
          </p>
          <p>
            在UE中输出Base Color、Vertex Normal与AO后生成远景贴图，并通过材质重建法线、AO与双面受光。
          </p>
        </div>
      </aside>
    </section>
  );
}
