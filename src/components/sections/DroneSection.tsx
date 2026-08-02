import { fullProjectVideo } from "../../data/videos";
import { BilibiliPlayer } from "../media/BilibiliPlayer";
import { SectionHeader } from "../ui/SectionHeader";

export function DroneSection() {
  return (
    <section className="content-section" id="drone">
      <SectionHeader
        index="04"
        eyebrow="FULL DRONE & GAMEPLAY VIDEO"
        title="完整无人机与人物跑图视频"
        description="通过完整无人机镜头与人物跑图，集中展示《西福寺》的场景规模、空间层级、区域衔接及玩家游览体验。"
      />
      <div className="video-stack">
        <BilibiliPlayer
          embedUrl={fullProjectVideo.embedUrl}
          externalUrl={fullProjectVideo.externalUrl}
          title="完整无人机与人物跑图视频"
          description="通过完整无人机镜头与人物跑图，集中展示《西福寺》的场景规模、空间层级、区域衔接及玩家游览体验。"
        />
      </div>
    </section>
  );
}