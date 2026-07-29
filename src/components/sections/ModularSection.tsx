import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function ModularSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);

  return (
    <section className="content-section" id="modular">
      <SectionHeader
        index="07"
        eyebrow="MODULAR ARCHITECTURE"
        title="模块化建筑与道具"
        description={sectionCopy.modular}
      />
      {images.length ? (
        <ConfiguredMediaGroup
          files={images}
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
    </section>
  );
}
