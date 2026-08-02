import { useState } from "react";
import "./BilibiliPlayer.css";

interface BilibiliPlayerProps {
  embedUrl: string;
  externalUrl: string;
  title: string;
  description: string;
}

export function BilibiliPlayer({
  embedUrl,
  externalUrl,
  title,
  description,
}: BilibiliPlayerProps) {
  const [isActivated, setIsActivated] = useState(false);

  return (
    <figure className="video-frame bilibili-player">
      <div className="video-frame__media bilibili-player__media">
        {isActivated ? (
          <iframe
            src={embedUrl}
            title={`西福寺${title}`}
            loading="lazy"
            scrolling="no"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        ) : (
          <button
            className="video-frame__activation bilibili-player__activation"
            type="button"
            aria-label={`播放西福寺${title}`}
            onClick={() => setIsActivated(true)}
          >
            <span className="video-frame__play-icon" aria-hidden="true" />
            <span>播放完整视频</span>
          </button>
        )}
      </div>
      <figcaption>
        <div>
          <p className="video-frame__title">{title}</p>
          <p>{description}</p>
        </div>
        <a
          className="bilibili-player__link"
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          在Bilibili中观看
        </a>
      </figcaption>
    </figure>
  );
}
