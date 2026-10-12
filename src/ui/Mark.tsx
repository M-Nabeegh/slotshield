export function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <rect x="7" y="7" width="8" height="8" rx="2" fill="var(--on-accent)" />
      <rect x="17" y="7" width="8" height="8" rx="2" fill="var(--on-accent)" fillOpacity=".38" />
      <rect x="7" y="17" width="8" height="8" rx="2" fill="var(--on-accent)" fillOpacity=".38" />
      <path
        d="M17.5 21.2l2.4 2.4 4.6-4.9"
        stroke="var(--on-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
