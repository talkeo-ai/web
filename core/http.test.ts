import { afterEach, describe, expect, it, vi } from "vitest";

import { isCoreError } from "./contracts";
import { createHttpCore } from "./http";
import errors from "./mock/fixtures/errors.json";
import items from "./mock/fixtures/items.json";
import planCard from "./mock/fixtures/plan-card.json";
import session from "./mock/fixtures/session.json";
import talkeo from "./mock/fixtures/talkeo.json";

/**
 * The adapter against a fetch that answers with the recorded fixtures.
 *
 * Nothing here reaches a network. What is held is the mapping — one path per
 * call, the request as the body — and what happens at the boundary: a recorded
 * answer parses, a declared failure becomes a `CoreError`, and anything else
 * is an error and not a value.
 */

const BASE_URL = "https://core.example.test";

type Call = { url: string; method: string; body: unknown };

function answering(status: number, body: unknown) {
  const calls: Call[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        method: init.method ?? "GET",
        body: JSON.parse(String(init.body)),
      });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );

  return calls;
}

describe("the HTTP adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts each call to its own path with the request as the body", async () => {
    const calls = answering(200, session.get_flow_state);
    const core = createHttpCore(BASE_URL);

    const result = await core.getFlowState({ session_id: "s_1" });

    expect(calls).toEqual([
      {
        url: `${BASE_URL}/v1/tools/get_flow_state`,
        method: "POST",
        body: { session_id: "s_1" },
      },
    ]);
    expect(result.flow.step).toBe(session.get_flow_state.flow.step);
  });

  it("sends an empty body for calls that take no request", async () => {
    const calls = answering(200, session.create_anonymous_user);
    const core = createHttpCore(BASE_URL);

    const result = await core.createAnonymousUser();

    expect(calls[0]?.url).toBe(`${BASE_URL}/v1/tools/create_anonymous_user`);
    expect(calls[0]?.body).toEqual({});
    expect(result.user_id).toBe(session.create_anonymous_user.user_id);
  });

  it("parses the assistant's turn, timings and marks included", async () => {
    answering(200, talkeo.talkeo_turn.opening);
    const core = createHttpCore(BASE_URL);

    const { turn, flow } = await core.talkeoTurn({ session_id: "s_1" });

    expect(turn.turn_id).toBe("tt_0001");
    expect(turn.marks.length).toBeGreaterThan(0);
    expect(turn.word_timings.length).toBeGreaterThan(0);
    expect(turn.audio?.url).toMatch(/^\/mock-audio\//);
    expect(flow.step).toBe("talkeo_interview");
  });

  it("parses an exercise through the discriminated union", async () => {
    answering(200, items.get_next_item.meaning_card);
    const core = createHttpCore(BASE_URL);

    const { item } = await core.getNextItem({ session_id: "s_1" });

    expect(item?.instrument).toBe("meaning_card");
    if (item?.instrument === "meaning_card") {
      expect(item.payload.swipe_left_allowed).toBe(true);
    }
  });

  it("parses the plan card after an edit", async () => {
    const calls = answering(200, planCard.edit_plan_card);
    const core = createHttpCore(BASE_URL);

    const { plan } = await core.editPlanCard({
      session_id: "s_1",
      add_labels: ["portfolio"],
    });

    expect(calls[0]?.body).toEqual({
      session_id: "s_1",
      add_labels: ["portfolio"],
    });
    expect(plan.goal.version).toBe(3);
    expect(plan.today.map((cell) => cell.label)).toContain("portfolio");
  });

  it("turns a declared failure into a CoreError with its code", async () => {
    answering(409, errors.flow_mismatch);
    const core = createHttpCore(BASE_URL);

    await expect(
      core.getNextItem({ session_id: "s_1" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isCoreError(error) && error.code === errors.flow_mismatch.error.code,
    );
  });

  it("reads the failure code even on a 200", async () => {
    answering(200, errors.bad_id);
    const core = createHttpCore(BASE_URL);

    await expect(core.getGoal({ user_id: "nobody" })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "BAD_ID",
    );
  });

  it("refuses a failing status with no declared failure", async () => {
    answering(502, { detail: "upstream" });
    const core = createHttpCore(BASE_URL);

    await expect(core.getDose({ user_id: "u_1" })).rejects.toThrow(
      /502 for get_dose/,
    );
  });

  it("refuses an answer that does not match the contract", async () => {
    answering(200, { schema_version: 1, flow: { step: "elsewhere" } });
    const core = createHttpCore(BASE_URL);

    await expect(core.getFlowState({ session_id: "s_1" })).rejects.toThrow();
  });
});
