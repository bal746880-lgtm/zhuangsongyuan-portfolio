import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function EnvironmentStillsSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);

  return (
    <section className="content-section" id="environment">
      <SectionHeader
        index="11"
        eyebrow="ENVIRONMENT STILLS"
        title="场景静帧"
        description="补充建筑、植被、地面、水面与环境细节镜头。"
      />
      {images.length ? (
        <ConfiguredMediaGroup
          files={images}
          config={galleryLayouts.environmentStills}
          sectionId="environment-stills-gallery"
          title="补充场景镜头"
          caption="连续查看建筑细节、植被层次、材质应用、地面融合与环境布置。"
          altPrefix="西福寺场景静帧："
          itemCaption="西福寺环境补充镜头。"
        />
      ) : (
        <PlaceholderPanel label="场景素材待接入" detail="“场景静帧”文件夹中未读取到图片。" />
      )}
    </section>
  );
}
