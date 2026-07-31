import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  index: string;
  description?: string;
  titleAside?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  index,
  description,
  titleAside,
}: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-header__index" aria-hidden="true">
        {index}
      </div>
      <div className="section-header__copy">
        <p className="eyebrow">{eyebrow}</p>
        <div className="section-header__title-line">
          <h2>{title}</h2>
          {titleAside ? (
            <div className="section-header__title-aside">{titleAside}</div>
          ) : null}
        </div>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
    </header>
  );
}
