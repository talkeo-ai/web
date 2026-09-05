import {
  CoreError,
  SCHEMA_VERSION,
  type ClientDeclaration,
  type Flow,
  type Goal,
  type Instrument,
  type Item,
  type Step,
} from "../contracts";
import type { CorePort } from "../port";

import {
  GOAL_DRAFT,
  ROLEPLAY_BUNDLE,
  ROLEPLAY_CHECKS,
  ROLEPLAY_REPLY_AUDIO,
  SITUATION_CLASSES,
  STATE_MAP_STANDARD,
  STATE_MAP_ZERO,
  STATE_SUMMARY,
} from "./fixtures";
import { OPENING_ITEM_COUNT, standardSequence, zeroSequence } from "./script";
import {
  createSession,
  createUser,
  findGoal,
  findGoalOwner,
  nextGoalId,
  requireSession,
  requireSessionOfUser,
  requireUser,
  type MockSession,
} from "./session-state";

/**
 * The adapter that answers while there is no service to talk to.
 *
 * It is not a stub returning canned values: it keeps a run's state and moves
 * the flow, so screens can be built and walked end to end. What it answers with
 * comes from the service's own recorded fixtures.
 *
 * **Where the run moves is decided here, and that is the one thing this file
 * invents.** The catalog fixes which call belongs to which step, but not what
 * ends a step — the real service decides that from what it has gathered. Every
 * transition below is marked, and none of them is a rule a screen may rely on:
 * a screen renders `flow.step` and never predicts the next one.
 */

function flowOf(session: MockSession): Flow {
  return { ...session.flow };
}

function requireStep(session: MockSession, ...allowed: Step[]): void {
  if (!allowed.includes(session.flow.step)) {
    throw new CoreError(
      "FLOW_MISMATCH",
      `call is not valid at step '${session.flow.step}'`,
    );
  }
}

/** Instruments whose attempt is a recording, so they need the microphone. */
const NEEDS_AUDIO: ReadonlySet<Instrument> = new Set<Instrument>([
  "elicited_imitation",
  "speech_read_aloud",
  "speech_timed_qa",
  "speech_description",
]);

/**
 * Drops what this client did not declare.
 *
 * Both halves of the declaration matter: an instrument with no renderer is
 * never served, and neither is one that would ask for a recording from a
 * client that said it cannot capture audio.
 */
function serveable(items: Item[], client: ClientDeclaration): Item[] {
  const canRecord = client.artefacts.includes("audio");

  return items.filter(
    (item) =>
      client.supported_instruments.includes(item.instrument) &&
      (canRecord || !NEEDS_AUDIO.has(item.instrument)),
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createMockCore(): CorePort {
  return {
    // --- reads ---

    async getFlowState({ session_id }) {
      return {
        schema_version: SCHEMA_VERSION,
        flow: flowOf(requireSession(session_id)),
      };
    },

    async getNextItem({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "items");

      const item = session.queue.shift();

      if (!item) {
        // Mock transition: the scripted list ran out. The real service stops
        // when it has enough, which is not something a list can express.
        session.flow.step =
          session.flow.mode === "zero" ? "verdict" : "kai_briefing";

        return {
          schema_version: SCHEMA_VERSION,
          item: null,
          flow: flowOf(session),
        };
      }

      session.served.add(item.item_id);
      return { schema_version: SCHEMA_VERSION, item };
    },

    async getStateMap({ user_id }) {
      const session = requireSessionOfUser(user_id);

      return {
        schema_version: SCHEMA_VERSION,
        state_map:
          session.flow.mode === "zero" ? STATE_MAP_ZERO : STATE_MAP_STANDARD,
      };
    },

    async getStateSummary({ user_id }) {
      requireUser(user_id);
      return { schema_version: SCHEMA_VERSION, state_summary: STATE_SUMMARY };
    },

    async getSituationClasses() {
      return { schema_version: SCHEMA_VERSION, classes: SITUATION_CLASSES };
    },

    async getRoleplayBundle({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "kai_briefing", "roleplay");

      return {
        schema_version: SCHEMA_VERSION,
        roleplay_bundle: {
          ...ROLEPLAY_BUNDLE,
          // A denied microphone moves the exchange to text, and that is said
          // out loud rather than quietly degraded.
          mode: session.flow.mic_granted ? "voice" : "chat",
        },
      };
    },

    async getGoal({ user_id }) {
      return {
        schema_version: SCHEMA_VERSION,
        goals: requireUser(user_id).goals,
      };
    },

    // --- writes ---

    async createAnonymousUser() {
      return { schema_version: SCHEMA_VERSION, user_id: createUser().user_id };
    },

    async createSession({ user_id, client }) {
      const session = createSession(user_id, client);

      return {
        schema_version: SCHEMA_VERSION,
        session_id: session.session_id,
        flow: flowOf(session),
      };
    },

    async submitSurvey({ session_id, self_assessment, scope_areas }) {
      const session = requireSession(session_id);
      requireStep(session, "survey");

      if (scope_areas.length === 0) {
        throw new CoreError(
          "INVALID_INPUT",
          'scope_areas must be a non-empty list of areas or ["all"]',
        );
      }

      session.self_assessment = self_assessment;
      session.scope = { areas: scope_areas, version: 1 };

      return {
        schema_version: SCHEMA_VERSION,
        scope: session.scope,
        flow: flowOf(session),
      };
    },

    async setDisplayName({ user_id, name }) {
      const user = requireUser(user_id);
      const session = requireSessionOfUser(user_id);

      user.display_name = name;
      session.flow.display_name = name;

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async setMicPermission({ session_id, granted }) {
      const session = requireSession(session_id);
      requireStep(session, "survey", "kai_briefing");

      if (session.flow.step === "survey") {
        if (!session.scope) {
          throw new CoreError(
            "FLOW_MISMATCH",
            "the survey has not been submitted yet",
          );
        }
        // Mock transition: answering the microphone question is the last thing
        // the opening screens ask for.
        session.flow.step = "kai_interview";
      } else {
        // Mock transition: the microphone is offered once more before the
        // exchange, and answering it starts the exchange.
        session.flow.step = "roleplay";
      }

      session.flow.mic_granted = granted;

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async logKaiTurn({ session_id, speaker }) {
      const session = requireSession(session_id);
      requireStep(session, "kai_interview", "kai_briefing");

      // Mock transition: the guide's own turn after the card is signed is the
      // goodbye. The real service closes on its own checklist, not on a count.
      if (
        session.flow.step === "kai_interview" &&
        session.goal_signed &&
        speaker === "kai"
      ) {
        session.flow.step = "items";
        session.queue = serveable(standardSequence(), session.client);
      }

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async createGoalDraft({ user_id, name, focus, kind }) {
      const user = requireUser(user_id);
      const session = requireSessionOfUser(user_id);

      const goal: Goal = {
        ...GOAL_DRAFT,
        goal_id: nextGoalId(),
        kind: kind ?? "main",
        status: "draft",
        name,
        focus: focus ?? null,
        target_date: null,
        version: 0,
        signed_ts: null,
      };

      user.goals.push(goal);

      return { schema_version: SCHEMA_VERSION, goal, flow: flowOf(session) };
    },

    async updateGoalDraft({ goal_id, name, focus, target_date }) {
      const owner = findGoalOwner(goal_id);
      const goal = findGoal(owner, goal_id);

      if (goal.status !== "draft") {
        throw new CoreError("CONFLICT", "a signed goal is not a draft");
      }

      if (name !== undefined) goal.name = name;
      if (focus !== undefined) goal.focus = focus;
      if (target_date !== undefined) goal.target_date = target_date;

      return {
        schema_version: SCHEMA_VERSION,
        goal,
        flow: flowOf(requireSessionOfUser(owner.user_id)),
      };
    },

    async signGoal({ goal_id }) {
      const owner = findGoalOwner(goal_id);
      const goal = findGoal(owner, goal_id);
      const session = requireSessionOfUser(owner.user_id);

      goal.status = "active";
      goal.version = 1;
      goal.signed_ts = nowIso();
      session.goal_signed = true;

      return { schema_version: SCHEMA_VERSION, goal, flow: flowOf(session) };
    },

    async setSituationClass({ user_id, situation_class_id }) {
      const session = requireSessionOfUser(user_id);

      const known = SITUATION_CLASSES.some(
        (entry) => entry.situation_class_id === situation_class_id,
      );
      if (!known) {
        throw new CoreError("BAD_ID", "situation_class_id does not exist");
      }

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async setNeedFuture({ user_id }) {
      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(requireSessionOfUser(user_id)),
      };
    },

    async addInterest({ user_id }) {
      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(requireSessionOfUser(user_id)),
      };
    },

    async submitResponse({ session_id, item_id }) {
      const session = requireSession(session_id);
      requireStep(session, "items");

      if (!session.served.has(item_id)) {
        throw new CoreError("BAD_ID", "item_id was never served");
      }

      session.answered += 1;

      // Mock transition: the run changes shape once the opening items are in.
      // Nothing in the payloads marked those items, and nothing in this result
      // says it happened — the change reaches a screen only as `flow.mode`.
      if (
        session.flow.mode === "standard" &&
        session.self_assessment === "just_starting" &&
        session.answered === OPENING_ITEM_COUNT
      ) {
        session.flow.mode = "zero";
        session.queue = serveable(zeroSequence(), session.client);
      }

      return {
        schema_version: SCHEMA_VERSION,
        accepted: true,
        flow: flowOf(session),
      };
    },

    async roleplayTurn({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "roleplay");

      return {
        schema_version: SCHEMA_VERSION,
        reply: {
          artefact: session.flow.mic_granted
            ? ROLEPLAY_REPLY_AUDIO
            : { kind: "text", text: ROLEPLAY_BUNDLE.scenario.setup },
        },
        flow: flowOf(session),
      };
    },

    async endRoleplay({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "roleplay");

      session.flow.step = "verdict";

      return {
        schema_version: SCHEMA_VERSION,
        checks: ROLEPLAY_CHECKS,
        flow: flowOf(session),
      };
    },

    async attachIdentity({ user_id, email }) {
      const user = requireUser(user_id);
      const session = requireSessionOfUser(user_id);

      user.email = email;
      session.flow.step = "day2";

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },
  };
}
