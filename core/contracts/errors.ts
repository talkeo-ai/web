import { z } from "zod";

import { usageSchema, type Usage } from "./accounts";

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
  /** A cataloged call whose implementation has not landed on the service. */
  "NOT_IMPLEMENTED",
  /** No session, or one that ended: start anonymous again or sign in. */
  "UNAUTHENTICATED",
  /** The session is fine, the ids in the request belong to someone else. */
  "FORBIDDEN",
  /** Out of allowance; the body's `usage.gate` says what to show. */
  "QUOTA_EXHAUSTED",
  /** The bot check was missing, failed, or already used. */
  "CHALLENGE_FAILED",
  /** Wrong, expired or spent code. A new one can always be asked for. */
  "CODE_INVALID",
  /** Not an address a code can go to, or a throwaway mailbox. */
  "EMAIL_REJECTED",
  /** Too many codes for this address or from this network. */
  "RATE_LIMITED",
  /** This email or Google account belongs to another registered account. */
  "IDENTITY_TAKEN",
  /** Google came back without a verified email, or with a stale state. */
  "OAUTH_FAILED",
]);

export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  /** Present when the failure is about the allowance. */
  usage: usageSchema.nullable().optional(),
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
  readonly usage: Usage | null;

  constructor(code: ErrorCode, message: string, usage: Usage | null = null) {
    super(message);
    this.name = "CoreError";
    this.code = code;
    this.usage = usage;
  }
}

/** Narrows an unknown throw, since `catch` gives no type. */
export function isCoreError(error: unknown): error is CoreError {
  return error instanceof CoreError;
}
