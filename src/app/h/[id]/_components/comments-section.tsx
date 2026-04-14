"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HarvestWithContent } from "@/lib/types";
import { AddCommentForm } from "./add-comment-form";

type CommentWithAuthor = HarvestWithContent["comments"][number];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function relative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function CommentItem({ c }: { c: CommentWithAuthor }) {
  return (
    <li className="nes-container is-rounded" style={{ marginBottom: 8 }}>
      <p className="text-sm" style={{ color: "var(--farm-muted)" }}>
        <Link
          href={`/u/${slugify(c.author.displayName)}`}
          className="underline"
          style={{ color: "var(--farm-grass-dark)" }}
        >
          {c.author.displayName}
        </Link>{" "}
        · {relative(c.createdAt)}
      </p>
      <p
        className="mt-2 whitespace-pre-wrap"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {c.body}
      </p>
    </li>
  );
}

export function CommentsSection({
  harvestId,
  initialComments,
}: {
  harvestId: string;
  initialComments: CommentWithAuthor[];
}) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);

  const { parents, childrenByParent } = useMemo(() => {
    const parents: CommentWithAuthor[] = [];
    const childrenByParent = new Map<string, CommentWithAuthor[]>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = childrenByParent.get(c.parentId) ?? [];
        arr.push(c);
        childrenByParent.set(c.parentId, arr);
      } else {
        parents.push(c);
      }
    }
    parents.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return { parents, childrenByParent };
  }, [comments]);

  return (
    <section
      className="nes-container with-title is-rounded"
      aria-labelledby="comments-title"
    >
      <p
        id="comments-title"
        className="title"
        style={{ fontFamily: "var(--font-pixel)" }}
      >
        Comments
      </p>

      <div className="mb-4">
        <AddCommentForm
          harvestId={harvestId}
          onAdded={(c) => setComments((cs) => [...cs, c])}
        />
      </div>

      {parents.length === 0 ? (
        <p style={{ color: "var(--farm-muted)" }}>No comments yet.</p>
      ) : (
        <ul className="list-none p-0">
          {parents.map((p) => {
            const kids = childrenByParent.get(p.id) ?? [];
            return (
              <li key={p.id}>
                <CommentItem c={p} />
                {kids.length > 0 ? (
                  <ul className="list-none pl-6">
                    {kids.map((k) => (
                      <li key={k.id}>
                        <CommentItem c={k} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
