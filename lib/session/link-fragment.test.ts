import { describe, expect, it } from "vitest";

import { readFragment } from "./link-fragment";

describe("readFragment", () => {
  it("reads what the service writes, plus signs included", () => {
    // Python's urlencode: `+` in the address is %2B, a space would be `+`.
    expect(readFragment("#email=smoke%2B1%40example.com&code=424242")).toEqual({
      email: "smoke+1@example.com",
      code: "424242",
    });
  });

  it("is nothing when either half is missing", () => {
    expect(readFragment("")).toBeNull();
    expect(readFragment("#email=a%40b.co")).toBeNull();
    expect(readFragment("#code=424242")).toBeNull();
    expect(readFragment("#email=&code=424242")).toBeNull();
  });
});
