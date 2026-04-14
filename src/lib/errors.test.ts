import { describe, it, expect } from "vitest";
import { apiError, describeError, ERROR_CODES } from "./errors";

describe("errors", () => {
  it("apiError returns a Response with correct shape + status", async () => {
    const res = apiError(ERROR_CODES.UNAUTHORIZED, "nope", 401);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "unauthorized", message: "nope" },
    });
  });

  it("describeError stringifies Error instances", () => {
    const e = new TypeError("boom");
    expect(describeError(e)).toBe("TypeError: boom");
  });

  it("describeError handles non-errors", () => {
    expect(describeError("raw")).toBe("raw");
    expect(describeError(42)).toBe("42");
    expect(describeError(null)).toBe("null");
  });
});
