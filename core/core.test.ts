import { describe, expect, it } from "vitest";

import { verdictSchema } from "./contracts";
import { createMockCore } from "./mock";

describe("the mock adapter", () => {
  it("returns a verdict that satisfies the contract", async () => {
    const verdict = await createMockCore().getVerdict("user");

    expect(() => verdictSchema.parse(verdict)).not.toThrow();
  });

  it("reports a band per area, never one global level", async () => {
    const verdict = await createMockCore().getVerdict("user");

    expect(verdict.areas.length).toBeGreaterThan(1);
    for (const area of verdict.areas) {
      expect(area.floor).toBeTruthy();
      expect(area.ceiling).toBeTruthy();
    }
  });

  it("states what it did not measure", async () => {
    const verdict = await createMockCore().getVerdict("user");

    expect(verdict.unmeasured).not.toBe("");
  });
});
