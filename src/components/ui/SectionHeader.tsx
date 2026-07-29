interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  index: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  index,
  description,
}: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-header__index" aria-hidden="true">
        {index}
      </div>
      <div className="section-header__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className="section-header__description">{description}</p> : null}
      </div>
    </header>
  );
}
