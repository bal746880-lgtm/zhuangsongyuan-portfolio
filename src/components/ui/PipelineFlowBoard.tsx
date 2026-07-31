import type { CSSProperties } from "react";
import type { PipelineStep } from "../../data/aiAssetPipelines";

interface PipelineFlowBoardProps {
  steps: readonly PipelineStep[];
  description: string;
  ariaLabel: string;
}

export function PipelineFlowBoard({
  steps,
  description,
  ariaLabel,
}: PipelineFlowBoardProps) {
  return (
    <section className="pipeline-flow-board" aria-label={ariaLabel}>
      <ol
        className="pipeline-flow-board__steps"
        style={
          {
            "--pipeline-step-count": steps.length,
          } as CSSProperties
        }
      >
        {steps.map((step, index) => (
          <li key={step.number}>
            <div className="pipeline-flow-board__number-row">
              <span className="pipeline-flow-board__number">
                {String(step.number).padStart(2, "0")}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className="pipeline-flow-board__connector"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="pipeline-flow-board__copy">
              <strong>{step.title}</strong>
              <small>{step.english}</small>
            </div>
          </li>
        ))}
      </ol>
      <p>{description}</p>
    </section>
  );
}
