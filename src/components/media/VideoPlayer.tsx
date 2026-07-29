import { useEffect, useId, useRef, useState } from "react";
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
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const pauseOtherVideo = (event: Event) => {
      const playingId = (event as CustomEvent<string>).detail;
      if (playingId !== id) videoRef.current?.pause();
    };
    window.addEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
    return () => window.removeEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
  }, [id]);

  useEffect(() => {
    if (!isActivated) return;
    const element = videoRef.current;
    if (!element) return;
    element.load();
    void element.play().catch(() => {
      // Controls remain available when browser autoplay policy blocks playback.
    });
  }, [isActivated]);

  return (
    <figure className="video-frame">
      <div className="video-frame__media">
        {isActivated ? (
          <video
            ref={videoRef}
            src={video.src ?? video.url}
            controls
            playsInline
            preload="none"
            aria-label={title}
            onPlay={() =>
              window.dispatchEvent(
                new CustomEvent<string>(VIDEO_PLAY_EVENT, { detail: id }),
              )
            }
          >
            当前浏览器不支持视频播放。
          </video>
        ) : (
          <button
            className="video-frame__activation"
            type="button"
            aria-label={`播放${title}`}
            onClick={() => setIsActivated(true)}
          >
            <span className="video-frame__play-icon" aria-hidden="true" />
            <span>播放视频</span>
          </button>
        )}
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
