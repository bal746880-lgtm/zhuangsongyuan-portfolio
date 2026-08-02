import type { CSSProperties } from "react";
import type {
  PipelinePhase,
  PipelineStep,
} from "../../data/aiAssetPipelines";

interface PipelineFlowBoardProps {
  steps?: readonly PipelineStep[];
  phases?: readonly PipelinePhase[];
  description: string;
  ariaLabel: string;
}

function PipelineStepList({ steps }: { steps: readonly PipelineStep[] }) {
  return (
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
  );
}

export function PipelineFlowBoard({
  steps = [],
  phases,
  description,
  ariaLabel,
}: PipelineFlowBoardProps) {
  return (
    <section
      className={`pipeline-flow-board${phases?.length ? " pipeline-flow-board--phased" : ""}`}
      aria-label={ariaLabel}
    >
      {phases?.length ? (
        <div className="pipeline-flow-board__phases">
          {phases.map((phase) => (
            <section className="pipeline-flow-board__phase" key={phase.number}>
              <header className="pipeline-flow-board__phase-heading">
                <span>PHASE {String(phase.number).padStart(2, "0")}</span>
                <div>
                  <strong>{phase.title}</strong>
                  <small>{phase.english}</small>
                </div>
              </header>
              <PipelineStepList steps={phase.steps} />
            </section>
          ))}
        </div>
      ) : (
        <PipelineStepList steps={steps} />
      )}
      <p>{description}</p>
    </section>
  );
}