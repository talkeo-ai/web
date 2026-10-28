import {
  CoreError,
  SCHEMA_VERSION,
  type Account,
  type Identity,
  type SessionResult,
  type Usage,
} from "../contracts";
import type { CorePort } from "../port";

import { createUser } from "./session-state";

/**
 * Accounts as the mock keeps them, so the sign-in screens can be walked with no
 * service running.
 *
 * It follows the service's rules where a screen can see them: the caller is the
 * session token, never an id in the body; a code works only for the session
 * that asked for it; signing in from an anonymous session keeps its user, and
 * an email that already has an account switches to that one. What it invents
 * is the secrets: every mailed code is `MOCK_EMAIL_CODE`, and Google answers
 * at once, for `MOCK_GOOGLE_EMAIL`.
 */

export const MOCK_EMAIL_CODE = "424242";
export const MOCK_GOOGLE_EMAIL = "smoke-google@example.com";
const MOCK_GOOGLE_STATE = "mock-google-state";
const MOCK_GOOGLE_CODE = "mock-google-code";

type MockAccount = {
  user_id: string;
  registered: boolean;
  identities: Identity[];
  used_percent: number;
};

type MockAccountsState = {
  accounts: Map<string, MockAccount>;
  /** Session token → user. A signed-out token is removed. */
  tokens: Map<string, string>;
  /** Email → the session that asked for its code. */
  pendingCodes: Map<string, string>;
};

// On the process, not the module: Next bundles route handlers apart from the
// pages and their server actions, so a module-level map would exist twice and
// the Google callback would not know the session the sign-in page started.
const shared = globalThis as { __talkeoMockAccounts?: MockAccountsState };
const state: MockAccountsState = (shared.__talkeoMockAccounts ??= {
  accounts: new Map(),
  tokens: new Map(),
  pendingCodes: new Map(),
});
const { accounts, tokens, pendingCodes } = state;

/** Drops every account and session. Tests call it next to `resetMockStore`. */
export function resetMockAccounts(): void {
  accounts.clear();
  tokens.clear();
  pendingCodes.clear();
}

function usageOf(account: MockAccount): Usage {
  return account.registered
    ? {
        kind: "registered",
        gate: account.used_percent >= 100 ? "wait" : "ok",
        used_percent: account.used_percent,
        window_hours: 24,
      }
    : {
        kind: "anonymous",
        gate: account.used_percent >= 100 ? "sign_up" : "ok",
        used_percent: account.used_percent,
        window_hours: null,
      };
}

function accountOf(account: MockAccount): Account {
  return {
    user_id: account.user_id,
    registered: account.registered,
    email: account.identities[0]?.email ?? null,
    identities: account.identities,
    usage: usageOf(account),
  };
}

function issue(account: MockAccount, switched: boolean): SessionResult {
  const token = `mock-session-${crypto.randomUUID()}`;
  tokens.set(token, account.user_id);
  return {
    schema_version: SCHEMA_VERSION,
    session_token: token,
    switched,
    account: accountOf(account),
  };
}

function owner(email: string): MockAccount | undefined {
  for (const account of accounts.values()) {
    if (account.registered && account.identities.some((i) => i.email === email))
      return account;
  }
  return undefined;
}

/**
 * Signs in on `email` from the session `token`: the same user if the email is
 * new, the email's own account if it already has one.
 */
function signIn(
  token: string,
  email: string,
  kind: Identity["kind"],
): SessionResult {
  const existing = owner(email);
  const current = accounts.get(tokens.get(token) ?? "");
  tokens.delete(token);

  if (existing) {
    if (!existing.identities.some((i) => i.kind === kind)) {
      existing.identities.push({ kind, email });
    }
    return issue(existing, existing.user_id !== current?.user_id);
  }
  if (!current) {
    throw new CoreError("UNAUTHENTICATED", "session expired");
  }
  current.registered = true;
  current.used_percent = 0;
  current.identities.push({ kind, email });
  return issue(current, false);
}

export function createMockAccounts(
  sessionToken: () => Promise<string | undefined>,
): Pick<
  CorePort,
  | "beginAnonymous"
  | "getAccount"
  | "startEmailCode"
  | "verifyEmailCode"
  | "beginGoogle"
  | "finishGoogle"
  | "signOut"
  | "issueStreamTicket"
  | "deleteAccount"
> {
  async function caller(): Promise<{ token: string; account: MockAccount }> {
    const token = await sessionToken();
    const account = accounts.get(tokens.get(token ?? "") ?? "");
    if (!token || !account) {
      throw new CoreError("UNAUTHENTICATED", "session expired");
    }
    return { token, account };
  }

  return {
    async beginAnonymous({ device }) {
      if (!device.challenge_token) {
        throw new CoreError("CHALLENGE_FAILED", "bot check missing");
      }
      const account: MockAccount = {
        user_id: createUser().user_id,
        registered: false,
        identities: [],
        used_percent: 0,
      };
      accounts.set(account.user_id, account);
      return issue(account, false);
    },

    async getAccount() {
      const { account } = await caller();
      return { schema_version: SCHEMA_VERSION, account: accountOf(account) };
    },

    async startEmailCode({ email }) {
      const { token } = await caller();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new CoreError("EMAIL_REJECTED", "not an email address");
      }
      pendingCodes.set(email, token);
      console.info(`sign-in code for ${email}: ${MOCK_EMAIL_CODE}`);
      return { schema_version: SCHEMA_VERSION, ok: true, expires_in: 600 };
    },

    async verifyEmailCode({ email, code }) {
      const { token } = await caller();
      if (code !== MOCK_EMAIL_CODE || pendingCodes.get(email) !== token) {
        throw new CoreError("CODE_INVALID", "wrong code");
      }
      pendingCodes.delete(email);
      return signIn(token, email, "email");
    },

    async beginGoogle({ redirect_uri }) {
      await caller();
      const back = new URL(redirect_uri);
      back.searchParams.set("state", MOCK_GOOGLE_STATE);
      back.searchParams.set("code", MOCK_GOOGLE_CODE);
      return { schema_version: SCHEMA_VERSION, authorize_url: back.toString() };
    },

    async finishGoogle({ state, code }) {
      const { token } = await caller();
      if (state !== MOCK_GOOGLE_STATE || code !== MOCK_GOOGLE_CODE) {
        throw new CoreError("OAUTH_FAILED", "stale state");
      }
      return signIn(token, MOCK_GOOGLE_EMAIL, "google");
    },

    async signOut() {
      const { token } = await caller();
      tokens.delete(token);
      return { schema_version: SCHEMA_VERSION, ok: true };
    },

    async issueStreamTicket() {
      await caller();
      return {
        schema_version: SCHEMA_VERSION,
        ticket: `mock-ticket-${crypto.randomUUID()}`,
        expires_in: 60,
      };
    },

    async deleteAccount() {
      const { account } = await caller();
      accounts.delete(account.user_id);
      for (const [token, userId] of tokens) {
        if (userId === account.user_id) tokens.delete(token);
      }
      return { schema_version: SCHEMA_VERSION, ok: true };
    },
  };
}
