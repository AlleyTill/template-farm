/**
 * Server-side markdown renderer. Parses markdown with `marked` and sanitizes
 * the resulting HTML with DOMPurify. Only a small allowlist of tags/attrs is
 * permitted. Raw HTML, script/style/iframe and event handlers are stripped.
 *
 * The stored comment/content body remains raw markdown; this function is
 * called at render time on the server so the client only ever sees safe HTML.
 */
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
];

const ALLOWED_ATTR = ["href", "title", "rel", "target"];

/**
 * Render a markdown source string to a sanitized HTML string safe to inject
 * via `dangerouslySetInnerHTML`. Links are forced to open in a new tab with
 * `rel="noopener nofollow"`.
 */
export function renderMarkdown(src: string): string {
  if (!src) return "";
  const rawHtml = marked.parse(src, { async: false }) as string;
  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  });
  // Harden links: ensure target/rel on every <a>.
  return clean.replace(
    /<a\s+([^>]*?)>/gi,
    (_m, attrs: string) => {
      const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrs);
      const href = hrefMatch?.[1] ?? "#";
      const safe = /^https?:\/\//i.test(href) ? href : "#";
      return `<a href="${safe}" target="_blank" rel="noopener nofollow">`;
    },
  );
}
