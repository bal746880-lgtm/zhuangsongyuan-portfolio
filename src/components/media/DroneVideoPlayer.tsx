import { useCallback, useEffect, useId, useRef } from "react";
import type { MediaFile } from "../../data/media";
import { formatBytes } from "../../utils/mediaHelpers";

interface DroneVideoPlayerProps {
  video: MediaFile;
  poster?: string;
  title: string;
  description: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    saveData?: boolean;
  };
}

const VIDEO_PLAY_EVENT = "xifo-video-play";

export function DroneVideoPlayer({
  video,
  poster,
  title,
  description,
}: DroneVideoPlayerProps) {
  const id = useId();
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasAttachedSourceRef = useRef(false);
  const hasCalledLoadRef = useRef(false);
  const videoSource = video.src ?? video.url;

  const attachSource = useCallback(
    (preload: "metadata" | "auto") => {
      const element = videoRef.current;
      if (!element || !videoSource) return;

      if (!hasAttachedSourceRef.current) {
        hasAttachedSourceRef.current = true;
        element.preload = preload;
        element.src = videoSource;

        if (!hasCalledLoadRef.current) {
          hasCalledLoadRef.current = true;
          element.load();
        }
        return;
      }

      if (preload === "auto") element.preload = "auto";
    },
    [videoSource],
  );

  useEffect(() => {
    const pauseOtherVideo = (event: Event) => {
      const playingId = (event as CustomEvent<string>).detail;
      if (playingId !== id) videoRef.current?.pause();
    };
    window.addEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
    return () => window.removeEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
  }, [id]);

  useEffect(() => {
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData;
    const target = frameRef.current;
    if (saveData || !target || !videoSource) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        attachSource("metadata");
        observer.disconnect();
      },
      { rootMargin: "1000px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [attachSource, videoSource]);

  return (
    <figure ref={frameRef} className="video-frame">
      <div className="video-frame__media">
        <video
          ref={videoRef}
          poster={poster}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          playsInline
          preload="none"
          aria-label={title}
          onPointerDownCapture={() => attachSource("auto")}
          onKeyDownCapture={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              attachSource("auto");
            }
          }}
          onPlay={() => {
            attachSource("auto");
            window.dispatchEvent(
              new CustomEvent<string>(VIDEO_PLAY_EVENT, { detail: id }),
            );
          }}
        >
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
