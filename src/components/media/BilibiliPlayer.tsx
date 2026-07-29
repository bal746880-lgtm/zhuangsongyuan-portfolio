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
  return (
    <figure className="video-frame bilibili-player">
      <div className="video-frame__media bilibili-player__media">
        <iframe
          src={embedUrl}
          title="西福寺人物完整跑图"
          loading="lazy"
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
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
