import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders basic markdown", () => {
    const html = renderMarkdown("**hi** _there_");
    expect(html).toContain("<strong>hi</strong>");
    expect(html).toContain("<em>there</em>");
  });

  it("strips <script> tags", () => {
    const html = renderMarkdown("hello<script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("strips inline event handlers and style", () => {
    const html = renderMarkdown('<p onclick="bad()" style="color:red">hi</p>');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("style");
  });

  it("strips iframe and form", () => {
    const html = renderMarkdown(
      "<iframe src='evil'></iframe><form></form>a",
    );
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<form");
  });

  it("forces target=_blank and rel=noopener nofollow on links", () => {
    const html = renderMarkdown("[go](https://example.com)");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener nofollow"');
  });

  it("neutralizes non-http(s) hrefs (javascript:)", () => {
    const html = renderMarkdown("[x](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("empty input returns empty string", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
