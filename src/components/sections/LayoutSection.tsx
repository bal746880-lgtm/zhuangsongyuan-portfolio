import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { sectionCopy } from "../../data/portfolio";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function LayoutSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);

  return (
    <section className="content-section" id="layout">
      <SectionHeader
        index="06"
        eyebrow="CONCEPT & LAYOUT"
        title="规划与跑图路线"
        description={sectionCopy.layout}
      />
      {images.length ? (
        <ConfiguredMediaGroup
          files={images}
          config={galleryLayouts.planning}
          sectionId="planning-media"
          altPrefix="西福寺规划与跑图路线："
          itemCaption="地图结构、空间节点与跑图路线规划。"
        />
      ) : (
        <PlaceholderPanel label="规划素材待接入" detail="当前未读取到规划与跑图路线图片。" />
      )}
    </section>
  );
}
