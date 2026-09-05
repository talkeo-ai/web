import { z } from "zod";

/**
 * The failures the service reports to a surface.
 *
 * The list is short because most of what can go wrong upstream is not a
 * surface's business. Codes about how work gets selected exist on the other
 * side and never arrive here.
 */
export const errorCodeSchema = z.enum([
  /** An id that does not exist, including one the caller invented. */
  "BAD_ID",
  "INVALID_INPUT",
  /** The call does not belong to the step the run is on. */
  "FLOW_MISMATCH",
  /** A stale version of something versioned. */
  "CONFLICT",
  "NOT_FOUND",
]);

export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});

export const errorResultSchema = z.object({ error: errorBodySchema });

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;

/**
 * What every adapter throws, so callers handle one type.
 *
 * The port returns results rather than result-or-error unions: a caller forced
 * to unwrap every call stops checking, and a step mismatch is a bug in this
 * client rather than a case to render.
 */
export class CoreError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "CoreError";
    this.code = code;
  }
}

/** Narrows an unknown throw, since `catch` gives no type. */
export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError;
}
