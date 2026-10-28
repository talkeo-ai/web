import { z } from "zod";

/**
 * Accounts and the free allowance: who is calling, and how much they have left.
 *
 * A visitor starts anonymous on a device and signs in by a mailed code or by
 * Google onto the same user. The service keeps the session; this client only
 * carries its token, from a cookie the browser cannot read, to every call.
 *
 * Money is never shown. The allowance arrives as a share used and a gate that
 * says what to show when it runs out: sign up, or wait for the window.
 */

const versioned = { schema_version: z.number().int() };

export const usageSchema = z.object({
  kind: z.enum(["anonymous", "registered"]),
  gate: z.enum(["ok", "sign_up", "wait"]),
  /** 0-100. */
  used_percent: z.number().int(),
  /** The rolling window a registered allowance refills over; null for anonymous. */
  window_hours: z.number().int().nullable().optional(),
});

export const identitySchema = z.object({
  kind: z.enum(["email", "google"]),
  email: z.string(),
});

export const accountSchema = z.object({
  user_id: z.string(),
  registered: z.boolean(),
  email: z.string().nullable().optional(),
  identities: z.array(identitySchema),
  usage: usageSchema,
});

/** Signals a page gathers on the first visit. Believed only as signals. */
export const deviceSignalsSchema = z.object({
  fingerprint: z.string(),
  challenge_token: z.string(),
});

export const beginAnonymousRequestSchema = z.object({
  device: deviceSignalsSchema,
  /** The address the request came from, as this server's edge saw it. */
  client_ip: z.string(),
  user_agent: z.string().optional(),
});

/**
 * A browser session, new or switched. `switched` is true when signing in landed
 * on an account that already existed, so what the visitor did anonymously stays
 * behind on its own user.
 */
export const sessionResultSchema = z.object({
  ...versioned,
  session_token: z.string(),
  switched: z.boolean(),
  account: accountSchema,
});

export const accountResultSchema = z.object({
  ...versioned,
  account: accountSchema,
});

export const startEmailCodeRequestSchema = z.object({
  email: z.string(),
  client_ip: z.string(),
  /** Language of the mail. */
  locale: z.enum(["es", "en", "pt"]),
});

export const startEmailCodeResultSchema = z.object({
  ...versioned,
  ok: z.literal(true),
  expires_in: z.number().int(),
});

export const verifyEmailCodeRequestSchema = z.object({
  email: z.string(),
  code: z.string(),
});

export const beginGoogleRequestSchema = z.object({
  /** Where Google sends the person back: a route on this server. */
  redirect_uri: z.string(),
});

export const beginGoogleResultSchema = z.object({
  ...versioned,
  authorize_url: z.string(),
});

export const finishGoogleRequestSchema = z.object({
  state: z.string(),
  code: z.string(),
  redirect_uri: z.string(),
});

/** The answer of a call about the account that reports only that it happened. */
export const okAccountResultSchema = z.object({
  ...versioned,
  ok: z.literal(true),
});

export const issueStreamTicketRequestSchema = z.object({
  session_id: z.string(),
});

export const streamTicketResultSchema = z.object({
  ...versioned,
  ticket: z.string(),
  expires_in: z.number().int(),
});

export const deleteAccountRequestSchema = z.object({
  /** The person was asked and said yes. */
  confirm: z.literal(true),
});

export type Usage = z.infer<typeof usageSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type Account = z.infer<typeof accountSchema>;
export type DeviceSignals = z.infer<typeof deviceSignalsSchema>;
export type BeginAnonymousRequest = z.infer<typeof beginAnonymousRequestSchema>;
export type SessionResult = z.infer<typeof sessionResultSchema>;
export type AccountResult = z.infer<typeof accountResultSchema>;
export type StartEmailCodeRequest = z.infer<typeof startEmailCodeRequestSchema>;
export type StartEmailCodeResult = z.infer<typeof startEmailCodeResultSchema>;
export type VerifyEmailCodeRequest = z.infer<
  typeof verifyEmailCodeRequestSchema
>;
export type BeginGoogleRequest = z.infer<typeof beginGoogleRequestSchema>;
export type BeginGoogleResult = z.infer<typeof beginGoogleResultSchema>;
export type FinishGoogleRequest = z.infer<typeof finishGoogleRequestSchema>;
export type OkAccountResult = z.infer<typeof okAccountResultSchema>;
export type IssueStreamTicketRequest = z.infer<
  typeof issueStreamTicketRequestSchema
>;
export type StreamTicketResult = z.infer<typeof streamTicketResultSchema>;
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
