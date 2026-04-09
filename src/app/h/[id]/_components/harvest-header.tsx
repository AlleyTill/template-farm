import Link from "next/link";
import type { HarvestWithContent } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "grown today";
  if (days === 1) return "grown 1 day ago";
  if (days < 30) return `grown ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `grown ${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `grown ${years} year${years > 1 ? "s" : ""} ago`;
}

export function HarvestHeader({ harvest }: { harvest: HarvestWithContent }) {
  const authorSlug = slugify(harvest.author.displayName);
  return (
    <header className="nes-container is-rounded" style={{ background: "var(--farm-wheat)" }}>
      <h1
        className="text-2xl sm:text-3xl mb-2"
        style={{ fontFamily: "var(--font-pixel)", color: "var(--farm-ink)" }}
      >
        {harvest.name}
      </h1>
      <p className="text-sm" style={{ color: "var(--farm-muted)" }}>
        by{" "}
        <Link
          href={`/u/${authorSlug}`}
          className="underline"
          style={{ color: "var(--farm-grass-dark)" }}
        >
          {harvest.author.displayName}
        </Link>{" "}
        · {relativeTime(harvest.createdAt)} ·{" "}
        <span
          className="nes-badge"
          aria-label={`source: ${harvest.source}`}
          style={{ marginLeft: 4 }}
        >
          <span
            className={
              harvest.source === "ai"
                ? "is-primary"
                : harvest.source === "community"
                  ? "is-success"
                  : "is-warning"
            }
          >
            {harvest.source}
          </span>
        </span>
      </p>
      {harvest.description ? (
        <p className="mt-3" style={{ fontFamily: "var(--font-body)" }}>
          {harvest.description}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {harvest.stack.map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs rounded"
            style={{
              background: "var(--farm-grass)",
              color: "var(--farm-ink)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      {harvest.forkOf ? (
        <p className="mt-3 text-sm" style={{ color: "var(--farm-muted)" }}>
          Grown from{" "}
          <Link href={`/h/${harvest.forkOf}`} className="underline">
            original
          </Link>
        </p>
      ) : null}
    </header>
  );
}
