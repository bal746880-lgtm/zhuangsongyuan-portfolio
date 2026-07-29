interface PlaceholderPanelProps {
  label: string;
  detail: string;
}

export function PlaceholderPanel({ label, detail }: PlaceholderPanelProps) {
  return (
    <div className="placeholder-panel" role="note">
      <span className="placeholder-panel__label">{label}</span>
      <p>{detail}</p>
    </div>
  );
}
