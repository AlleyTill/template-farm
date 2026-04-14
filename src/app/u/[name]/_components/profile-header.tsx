type ProfileHeaderProps = {
  displayName: string;
  createdAt: string;
  publicHarvestCount: number;
  totalLikesReceived: number;
};

function formatDate(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ProfileHeader({
  displayName,
  createdAt,
  publicHarvestCount,
  totalLikesReceived,
}: ProfileHeaderProps) {
  return (
    <header
      className="nes-container with-title"
      style={{ background: "var(--farm-grass)", color: "var(--farm-ink)" }}
    >
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        Farmer
      </p>
      <h1 style={{ fontFamily: "var(--font-pixel)", margin: 0 }}>
        {displayName}
      </h1>
      <p style={{ color: "var(--farm-muted)", marginTop: "0.5rem" }}>
        Farming since {formatDate(createdAt)}
      </p>
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginTop: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>{publicHarvestCount}</strong> public harvests
        </span>
        <span>
          <strong>{totalLikesReceived}</strong> likes received
        </span>
      </div>
    </header>
  );
}
