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
const INITIAL_BUFFER_SECONDS = 6;

function getBufferedAhead(element: HTMLVideoElement) {
  for (let index = 0; index < element.buffered.length; index += 1) {
    const start = element.buffered.start(index);
    const end = element.buffered.end(index);
    if (element.currentTime >= start && element.currentTime <= end) {
      return Math.max(0, end - element.currentTime);
    }
  }
  return 0;
}

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
  const hasStartedPlaybackRef = useRef(false);
  const isWaitingForBufferRef = useRef(false);
  const removeBufferListenersRef = useRef<(() => void) | null>(null);
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

  const clearBufferWait = useCallback(() => {
    removeBufferListenersRef.current?.();
    removeBufferListenersRef.current = null;
    isWaitingForBufferRef.current = false;
  }, []);

  const waitForInitialBuffer = useCallback(
    (element: HTMLVideoElement) => {
      if (hasStartedPlaybackRef.current) return false;
      if (
        getBufferedAhead(element) >= INITIAL_BUFFER_SECONDS ||
        element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
      ) {
        hasStartedPlaybackRef.current = true;
        return false;
      }

      element.pause();
      if (isWaitingForBufferRef.current) return true;
      isWaitingForBufferRef.current = true;

      const resumeWhenReady = () => {
        if (
          getBufferedAhead(element) < INITIAL_BUFFER_SECONDS &&
          element.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
        ) {
          return;
        }

        clearBufferWait();
        hasStartedPlaybackRef.current = true;
        void element.play().catch(() => {
          hasStartedPlaybackRef.current = false;
        });
      };

      element.addEventListener("progress", resumeWhenReady);
      element.addEventListener("canplay", resumeWhenReady);
      element.addEventListener("canplaythrough", resumeWhenReady);
      removeBufferListenersRef.current = () => {
        element.removeEventListener("progress", resumeWhenReady);
        element.removeEventListener("canplay", resumeWhenReady);
        element.removeEventListener("canplaythrough", resumeWhenReady);
      };
      resumeWhenReady();
      return true;
    },
    [clearBufferWait],
  );

  useEffect(() => {
    const pauseOtherVideo = (event: Event) => {
      const playingId = (event as CustomEvent<string>).detail;
      if (playingId !== id) {
        clearBufferWait();
        videoRef.current?.pause();
      }
    };
    window.addEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
    return () => window.removeEventListener(VIDEO_PLAY_EVENT, pauseOtherVideo);
  }, [clearBufferWait, id]);

  useEffect(() => clearBufferWait, [clearBufferWait]);

  useEffect(() => {
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData;
    const target = frameRef.current;
    if (saveData || !target || !videoSource) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        attachSource("auto");
        observer.disconnect();
      },
      { rootMargin: "2000px 0px" },
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
            const element = videoRef.current;
            if (element && waitForInitialBuffer(element)) return;
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
