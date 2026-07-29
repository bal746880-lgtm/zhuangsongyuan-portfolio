import type { MediaFolder } from "../../data/media";
import { videosIn } from "../../utils/mediaHelpers";
import { VideoPlayer } from "../media/VideoPlayer";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function DroneSection({ media }: { media?: MediaFolder }) {
  const videos = videosIn(media);

  return (
    <section className="content-section" id="drone">
      <SectionHeader
        index="04"
        eyebrow="DRONE OVERVIEW"
        title="无人机全景"
        description="通过连续航拍镜头展示场景规模、空间层级与区域之间的衔接关系。"
      />
      {videos.length ? (
        <div className="video-stack">
          {videos.map((video, index) => (
            <VideoPlayer
              key={video.relativePath}
              video={video}
              title={`无人机全景 ${String(index + 1).padStart(2, "0")}`}
              description="通过连续高空镜头观察寺庙空间、建筑关系与整体环境层次。"
            />
          ))}
        </div>
      ) : (
        <PlaceholderPanel label="视频待接入" detail="“无人机”文件夹中未读取到视频。" />
      )}
    </section>
  );
}
