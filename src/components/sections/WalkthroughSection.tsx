import type { MediaFolder } from "../../data/media";
import { sectionCopy } from "../../data/portfolio";
import { walkthroughVideo } from "../../data/videos";
import { BilibiliPlayer } from "../media/BilibiliPlayer";
import { SectionHeader } from "../ui/SectionHeader";

export function WalkthroughSection({
  media: _media,
}: {
  media?: MediaFolder;
}) {
  return (
    <section className="content-section" id="walkthrough">
      <SectionHeader
        index="12"
        eyebrow="GAMEPLAY WALKTHROUGH"
        title="人物完整跑图"
        description={sectionCopy.walkthrough}
      />
      <div className="video-stack">
        <BilibiliPlayer
          embedUrl={walkthroughVideo.embedUrl}
          externalUrl={walkthroughVideo.externalUrl}
          title="人物完整跑图 01"
          description="完整视频保留原始比例和原生控制，不自动播放或循环。"
        />
      </div>
    </section>
  );
}
