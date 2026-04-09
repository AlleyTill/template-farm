import Link from "next/link";
import type { Harvest } from "@/lib/types";

function formatDate(value: string | Date): string {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function PublicHarvestsList({
  harvests,
}: {
  harvests: Harvest[];
}) {
  if (harvests.length === 0) {
    return (
      <div className="nes-container with-title">
        <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
          Harvests
        </p>
        <p>No public harvests yet.</p>
      </div>
    );
  }

  return (
    <div className="nes-container with-title">
      <p className="title" style={{ fontFamily: "var(--font-pixel)" }}>
        Harvests
      </p>
      <ul
        className="nes-list is-circle"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {harvests.map((h) => (
          <li key={h.id}>
            <Link href={`/h/${h.id}`} style={{ color: "var(--farm-ink)" }}>
              <strong>{h.name}</strong>
            </Link>
            <div
              style={{
                color: "var(--farm-muted)",
                fontSize: "0.85em",
              }}
            >
              {h.stack.join(", ")} · {formatDate(h.createdAt)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
