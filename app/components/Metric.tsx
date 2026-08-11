export function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="metric">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}
