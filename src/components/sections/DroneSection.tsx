import type { MediaFolder } from "../../data/media";
import { videosIn } from "../../utils/mediaHelpers";
import { VideoPlayer } from "../media/VideoPlayer";
import { PlaceholderPanel } from "../ui/PlaceholderPanel";
import { SectionHeader } from "../ui/SectionHeader";

export function DroneSection({ media }: { media?: MediaFolder }) {
  const [video] = videosIn(media);

  return (
    <section className="content-section" id="drone">
      <SectionHeader
        index="04"
        eyebrow="DRONE OVERVIEW"
        title="无人机全景"
        titleAside={
          <span className="drone-section__viewing-note">
            完整跑图与无人机视频可于网站末尾观看
          </span>
        }
        description="通过连续航拍镜头展示场景规模、空间层级与区域之间的衔接关系。"
      />
      {video ? (
        <div className="video-stack">
          <VideoPlayer
            video={video}
            title="无人机全景"
            description="通过连续高空镜头观察寺庙空间、建筑关系与整体环境层次。"
          />
        </div>
      ) : (
        <PlaceholderPanel label="视频待接入" detail="“无人机”文件夹中未读取到视频。" />
      )}
    </section>
  );
}
