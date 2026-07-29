import { useEffect, useId, useRef } from "react";
import type { MediaFile } from "../../data/media";
import { formatBytes } from "../../utils/mediaHelpers";

interface VideoPlayerProps {
  video: MediaFile;
  title: string;
  description: string;
}

const VIDEO_PLAY_EVENT = "xifo-video-play";

export function VideoPlayer({
  video,
  title,
  description,
}: VideoPlayerProps) {
  const id = useId();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const pauseOtherVideo = (event: Event) => {
      const playingId = (event as CustomEvent<string>).detail;
      if (playingId !== id) videoRef.current?.pause();
    };
    window.addEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
    return () => window.removeEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
  }, [id]);

  return (
    <figure className="video-frame">
      <div className="video-frame__media">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          aria-label={title}
          onPlay={() =>
            window.dispatchEvent(
              new CustomEvent<string>(VIDEO_PLAY_EVENT, { detail: id }),
            )
          }
        >
          <source src={video.url} type="video/mp4" />
          当前浏览器不支持视频播放。
        </video>
      </div>
      <figcaption>
        <div>
          <p className="video-frame__title">{title}</p>
          <p>{description}</p>
        </div>
        <span className="video-frame__meta">{formatBytes(video.sizeBytes)}</span>
      </figcaption>
    </figure>
  );
}
