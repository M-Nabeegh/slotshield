export function SlotShieldMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`slotshield-mark${compact ? " is-compact" : ""}`} aria-hidden="true">
      <span className="slotshield-mark-core">SS</span>
      {!compact ? <span className="slotshield-mark-word">SlotShield</span> : null}
    </span>
  );
}
