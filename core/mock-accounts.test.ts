import { beforeEach, describe, expect, it } from "vitest";

import { isCoreError, type ErrorCode } from "./contracts";
import { createMockCore } from "./mock";
import {
  MOCK_EMAIL_CODE,
  MOCK_GOOGLE_EMAIL,
  resetMockAccounts,
} from "./mock/accounts";
import { resetMockStore } from "./mock/session-state";

/**
 * The mock's accounts follow the rules a sign-in screen can see: the caller is
 * the session, a code works only for the session that asked, signing in keeps
 * the anonymous user, and an email that already has an account switches to it.
 */

const DEVICE = { fingerprint: "fp_test", challenge_token: "ok" };
const BEGIN = { device: DEVICE, client_ip: "127.0.0.1" };

/** A browser: a cookie jar of one token, and the port reading it. */
function browser() {
  const jar: { token?: string } = {};
  const core = createMockCore(async () => jar.token);
  return { jar, core };
}

function failsWith(code: ErrorCode) {
  return (error: unknown) => isCoreError(error) && error.code === code;
}

async function anonymous() {
  const b = browser();
  const started = await b.core.beginAnonymous(BEGIN);
  b.jar.token = started.session_token;
  return { ...b, userId: started.account.user_id };
}

describe("the mock's accounts", () => {
  beforeEach(() => {
    resetMockStore();
    resetMockAccounts();
  });

  it("starts an anonymous user with its allowance untouched", async () => {
    const { core } = await anonymous();

    const { account } = await core.getAccount();

    expect(account.registered).toBe(false);
    expect(account.usage).toMatchObject({ kind: "anonymous", gate: "ok" });
  });

  it("refuses a first visit without the bot check", async () => {
    const { core } = browser();

    await expect(
      core.beginAnonymous({
        ...BEGIN,
        device: { ...DEVICE, challenge_token: "" },
      }),
    ).rejects.toSatisfy(failsWith("CHALLENGE_FAILED"));
  });

  it("refuses an account call with no session", async () => {
    const { core } = browser();

    await expect(core.getAccount()).rejects.toSatisfy(
      failsWith("UNAUTHENTICATED"),
    );
  });

  it("signs in by code on the same user", async () => {
    const { core, jar, userId } = await anonymous();

    await core.startEmailCode({
      email: "smoke-a@example.com",
      client_ip: "127.0.0.1",
      locale: "es",
    });
    const signed = await core.verifyEmailCode({
      email: "smoke-a@example.com",
      code: MOCK_EMAIL_CODE,
    });
    jar.token = signed.session_token;

    expect(signed.switched).toBe(false);
    expect(signed.account.user_id).toBe(userId);
    expect((await core.getAccount()).account.registered).toBe(true);
  });

  it("refuses a wrong code", async () => {
    const { core } = await anonymous();
    await core.startEmailCode({
      email: "smoke-b@example.com",
      client_ip: "127.0.0.1",
      locale: "es",
    });

    await expect(
      core.verifyEmailCode({ email: "smoke-b@example.com", code: "000000" }),
    ).rejects.toSatisfy(failsWith("CODE_INVALID"));
  });

  it("refuses a code asked for by another browser", async () => {
    const asker = await anonymous();
    const other = await anonymous();
    await asker.core.startEmailCode({
      email: "smoke-c@example.com",
      client_ip: "127.0.0.1",
      locale: "es",
    });

    await expect(
      other.core.verifyEmailCode({
        email: "smoke-c@example.com",
        code: MOCK_EMAIL_CODE,
      }),
    ).rejects.toSatisfy(failsWith("CODE_INVALID"));
  });

  it("switches to the account an email already has", async () => {
    const first = await anonymous();
    await first.core.startEmailCode({
      email: "smoke-d@example.com",
      client_ip: "127.0.0.1",
      locale: "es",
    });
    const owner = await first.core.verifyEmailCode({
      email: "smoke-d@example.com",
      code: MOCK_EMAIL_CODE,
    });

    const second = await anonymous();
    await second.core.startEmailCode({
      email: "smoke-d@example.com",
      client_ip: "127.0.0.1",
      locale: "es",
    });
    const signed = await second.core.verifyEmailCode({
      email: "smoke-d@example.com",
      code: MOCK_EMAIL_CODE,
    });

    expect(signed.switched).toBe(true);
    expect(signed.account.user_id).toBe(owner.account.user_id);
  });

  it("lands Google and the code for the same email on one user", async () => {
    const { core, jar } = await anonymous();
    const { authorize_url } = await core.beginGoogle({
      redirect_uri: "http://localhost/auth/google/callback",
    });
    const back = new URL(authorize_url);
    const google = await core.finishGoogle({
      state: back.searchParams.get("state") ?? "",
      code: back.searchParams.get("code") ?? "",
      redirect_uri: "http://localhost/auth/google/callback",
    });
    jar.token = google.session_token;

    const again = await anonymous();
    await again.core.startEmailCode({
      email: MOCK_GOOGLE_EMAIL,
      client_ip: "127.0.0.1",
      locale: "es",
    });
    const byCode = await again.core.verifyEmailCode({
      email: MOCK_GOOGLE_EMAIL,
      code: MOCK_EMAIL_CODE,
    });

    expect(byCode.account.user_id).toBe(google.account.user_id);
    expect(byCode.account.identities.map((i) => i.kind).sort()).toEqual([
      "email",
      "google",
    ]);
  });

  it("ends the session on sign out", async () => {
    const { core } = await anonymous();

    await core.signOut();

    await expect(core.getAccount()).rejects.toSatisfy(
      failsWith("UNAUTHENTICATED"),
    );
  });
});
