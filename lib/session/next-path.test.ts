import { describe, expect, it } from "vitest";

import { AFTER_SIGN_IN, safeNext } from "./next-path";

describe("where signing in goes next", () => {
  it.each(["/account", "/onboarding", "/es/home?x=1"])(
    "keeps a path on this site: %s",
    (path) => {
      expect(safeNext(path)).toBe(path);
    },
  );

  it.each([
    null,
    "",
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "account",
  ])("sends anything else home: %s", (path) => {
    expect(safeNext(path)).toBe(AFTER_SIGN_IN);
  });
});
