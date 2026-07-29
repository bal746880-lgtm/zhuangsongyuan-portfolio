import type { CareerEntry } from "../../data/experience";

interface CareerTimelineProps {
  entries: readonly CareerEntry[];
  awards: readonly string[];
}

export function CareerTimeline({ entries, awards }: CareerTimelineProps) {
  return (
    <section className="career-timeline" aria-labelledby="career-path-title">
      <header className="career-timeline__heading">
        <p className="eyebrow">CAREER PATH</p>
        <h3 id="career-path-title">经历路径</h3>
      </header>

      <div className="career-timeline__track">
        <span className="career-timeline__progress" aria-hidden="true" />

        {entries.map((entry, index) => (
          <article
            className={`career-timeline__node ${
              entry.current ? "career-timeline__node--current" : ""
            }`}
            key={entry.time}
          >
            <time dateTime={entry.time}>{entry.time}</time>
            <span className="career-timeline__marker" aria-hidden="true" />

            <div className="career-timeline__content">
              <p className="career-timeline__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h4>{entry.title}</h4>
              <p className="career-timeline__subtitle">{entry.subtitle}</p>
              <p className="career-timeline__description">
                {entry.description}
              </p>

              <ul className="career-timeline__tags" aria-label="相关能力">
                {entry.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>

              {index === 0 ? (
                <div className="career-timeline__awards">
                  <p>主要奖项</p>
                  <ul>
                    {awards.map((award) => (
                      <li key={award}>{award}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
