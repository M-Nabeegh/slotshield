export function PublicAccessBar({ publicUrl }: { publicUrl: string }) {
  return (
    <div className="public-access-bar">
      <span className="public-access-status">Public preview</span>
      <span className="public-access-trust">No sign-in needed</span>
      <span className="public-access-detail public-access-detail-primary">Read-only check</span>
      <span className="public-access-detail public-access-detail-secondary">Synthetic data</span>
      <span className="public-access-url" title={publicUrl}>
        {publicUrl}
      </span>
    </div>
  );
}
