import type { QuotaInfo } from "@/lib/types";

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const diffMs = d.getTime() - Date.now();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "soon";
    if (days === 1) return "tomorrow";
    if (days < 30) return `in ${days} days`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function QuotaCard({ quota }: { quota: QuotaInfo }) {
  const total = quota.monthlyQuota + quota.bonusPrompts;
  const used = Math.min(quota.quotaUsed, total);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const poolPct =
    quota.farmPoolMax > 0
      ? Math.round((quota.farmPoolRemaining / quota.farmPoolMax) * 100)
      : 0;

  return (
    <div
      className="nes-container with-title"
      style={{ background: "var(--farm-wheat)", color: "var(--farm-ink)" }}
    >
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        Farm Supply
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <div style={{ marginBottom: "0.25rem" }}>
            Monthly prompts: {quota.quotaUsed}/{quota.monthlyQuota}
          </div>
          <progress
            className="nes-progress is-success"
            value={pct}
            max={100}
          />
        </div>
        {quota.bonusPrompts > 0 && (
          <div>Bonus prompts: {quota.bonusPrompts}</div>
        )}
        {quota.spinTokens > 0 && <div>Spin tokens: {quota.spinTokens}</div>}
        <div>
          <div style={{ marginBottom: "0.25rem" }}>
            Farm pool today: {quota.farmPoolRemaining}/{quota.farmPoolMax}
          </div>
          <progress
            className="nes-progress is-warning"
            value={poolPct}
            max={100}
          />
        </div>
        <div style={{ color: "var(--farm-muted)" }}>
          Resets: {formatRelative(quota.quotaResetAt)}
        </div>
      </div>
    </div>
  );
}
