import type { ApiError } from "./types";

export const ERROR_CODES = {
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  QUOTA_EXHAUSTED: "quota_exhausted",
  FARM_RESTING: "farm_resting",
  INTERNAL: "internal_error",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
): Response {
  const body: ApiError = { error: { code, message } };
  return Response.json(body, { status });
}

/** Sanitize an arbitrary thrown error for logging. Never return raw to client. */
export function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}
