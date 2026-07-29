import type { MediaFolder } from "../../data/media";
import { imagesIn } from "../../utils/mediaHelpers";

export function HeroSection({ media }: { media?: MediaFolder }) {
  const heroImage = imagesIn(media)[0];

  return (
    <section className="hero-section" id="hero" aria-label="西福寺项目主视觉">
      {heroImage ? (
        <img
          className="hero-section__image"
          src={heroImage.src ?? heroImage.url}
          alt="西福寺项目主视觉"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          width={heroImage.width}
          height={heroImage.height}
        />
      ) : (
        <div className="hero-section__fallback" aria-hidden="true" />
      )}
      <a className="hero-section__scroll" href="#about" aria-label="向下浏览个人介绍">
        <span>向下浏览</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}
