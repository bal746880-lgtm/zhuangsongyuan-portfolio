import type { MediaFolder } from "../../data/media";
import { galleryLayouts } from "../../data/galleryLayouts";
import { imagesIn } from "../../utils/mediaHelpers";
import { ConfiguredMediaGroup } from "../media/ConfiguredMediaGroup";
import { FullWidthMediaStack } from "../media/FullWidthMediaStack";
import { SectionHeader } from "../ui/SectionHeader";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";

export function SelectedStillsSection({ media }: { media?: MediaFolder }) {
  const images = imagesIn(media);
  const featuredImages = images.slice(0, 3);
  const galleryImages = images.slice(3);

  return (
    <section className="content-section selected-stills-section" id="stills">
      <SectionHeader
        index="03"
        eyebrow="KEY STILLS"
        title="主要静帧"
        description="集中展示最终场景中的核心构图、空间层级与氛围表现。"
      />
      {images.length ? (
        <>
          <FullWidthMediaStack
            files={featuredImages}
            sectionId="selected-stills-featured"
            altPrefix="西福寺精选静帧："
            itemCaption="最终场景核心静帧。"
          />
          {galleryImages.length ? (
            <ConfiguredMediaGroup
              files={galleryImages}
              config={galleryLayouts.selectedStills}
              sectionId="selected-stills-gallery"
              altPrefix="西福寺精选静帧："
              itemCaption="最终场景补充静帧。"
              itemTitle={(file) =>
                `图 ${String(file.sortValue ?? 0).padStart(2, "0")}`
              }
              className="large-horizontal-gallery selected-stills__gallery"
            />
          ) : null}
        </>
      ) : (
        <PlaceholderPanel label="素材待接入" detail="“最强静帧”文件夹中未读取到图片。" />
      )}
    </section>
  );
}
