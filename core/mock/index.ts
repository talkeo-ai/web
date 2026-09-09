import {
  CoreError,
  SCHEMA_VERSION,
  type ClientDeclaration,
  type Flow,
  type Goal,
  type GoalV2,
  type Instrument,
  type InterviewCard,
  type InterviewEvent,
  type Item,
  type Mission,
  type MissionProgress,
  type PlanCard,
  type Step,
  type TalkeoTurn,
} from "../contracts";
import type { CorePort } from "../port";

import {
  DAY_PLAN,
  DOSE,
  DOSE_AFTER_TARGET,
  GOAL_ARTEFACT,
  GOAL_DRAFT,
  GOAL_V2,
  INTERVIEW_STAGES,
  PLAN_CARD,
  RANGO_AFTER_REORDER,
  ROLEPLAY_BUNDLE,
  ROLEPLAY_CHECKS,
  ROLEPLAY_REPLY_AUDIO,
  SITUATION_CLASSES,
  STATE_MAP_STANDARD,
  STATE_MAP_ZERO,
  STATE_SUMMARY,
  TALKEO_INTERVIEW_TURNS,
  TALKEO_TURN_DURING_ITEMS,
  TALKEO_TURN_LEVEL_EXPLAINED,
  TALKEO_TURN_PRE_ROLEPLAY,
  USER_ADDED_CELL_WHY,
} from "./fixtures";
import {
  lessonSequence,
  OPENING_ITEM_COUNT,
  standardSequence,
  verificationSequence,
  zeroSequence,
} from "./script";
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
 *
 * The run this adapter walks: `talkeo_interview` → `items` → `verification`
 * → `plan` → `lesson` → `roleplay` → `delta` → `verdict` → `email` → `home`.
 * The shorter shape (`mode: zero`) goes from `items` straight to `verdict`.
 * The steps of the earlier flow (`survey`, `kai_interview`, `kai_briefing`,
 * `day2`) are never entered; their calls still answer, for clients that have
 * a run on them.
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

let eventCounter = 0;

function newEvent(
  kind: InterviewEvent["kind"],
  origin: InterviewEvent["origin"],
  payload: Record<string, unknown>,
): InterviewEvent {
  eventCounter += 1;
  return { event_id: `ev_mock_${eventCounter}`, kind, origin, payload };
}

/**
 * Applies what a recorded turn registered to the run's own state.
 *
 * Mock rule: the recorded interview is replayed as it was, so what the
 * assistant heard in it (a name, the areas, the goal) lands on this run as if
 * this user had said it. A name typed on screen before the assistant asks
 * wins over the recorded one.
 */
function register(session: MockSession, turn: TalkeoTurn): void {
  session.interview.turns.push(turn);

  for (const event of turn.events) {
    session.interview.events.push(event);

    if (event.kind === "name_heard" && !session.flow.display_name) {
      const name = event.payload.name;
      if (typeof name === "string") session.flow.display_name = name;
    }

    if (event.kind === "scope_set" && !session.scope) {
      const areas = event.payload.areas;
      if (Array.isArray(areas)) {
        session.scope = { areas, version: 1 } as MockSession["scope"];
      }
    }

    if (event.kind === "goal_noted") {
      const name = event.payload.name;
      session.goal_name = typeof name === "string" ? name : GOAL_V2.name;
    }
  }
}

/**
 * Which stage the conversation reached, from the last one that announced itself.
 *
 * Mock rule: the service holds this and answers it directly. Here the events are
 * the only record there is, so it is read back off them — which is exactly the
 * replaying-the-whole-conversation that `cards` on the state exists to spare a
 * real screen.
 */
function stageReached(events: readonly InterviewEvent[]): number {
  let stage = 1;
  for (const event of events) {
    if (event.kind !== "stage_entered") continue;
    const at = event.payload.stage;
    if (typeof at === "number") stage = at;
  }
  return stage;
}

/** Every card as it stands, latest state per card. */
function cardsOnScreen(events: readonly InterviewEvent[]): InterviewCard[] {
  const cards = new Map<string, InterviewCard>();
  for (const event of events) {
    if (event.kind !== "card_updated") continue;
    const { card, state, body } = event.payload;
    if (typeof card !== "string") continue;
    cards.set(card, {
      card,
      state: typeof state === "string" ? state : "draft",
      body: (body ?? {}) as InterviewCard["body"],
    });
  }
  return [...cards.values()];
}

/** The goal as the interview left it, over the recorded one. */
function goalV2Of(session: MockSession): GoalV2 {
  if (session.goal_name === null) {
    throw new CoreError("NOT_FOUND", "the interview has not noted a goal yet");
  }

  return {
    ...GOAL_V2,
    name: session.goal_name,
    version: session.goal_version,
    artefacts: [...session.artefacts],
  };
}

function planCardOf(session: MockSession): PlanCard {
  return {
    goal: goalV2Of(session),
    today: [...(session.plan_today ?? PLAN_CARD.today)],
    practice: PLAN_CARD.practice,
  };
}

/** The missions of the recorded conversation, kept to the cells still in the plan. */
function missionsOf(session: MockSession): Mission[] {
  const today = session.plan_today ?? PLAN_CARD.today;
  return ROLEPLAY_BUNDLE.missions.filter((mission) =>
    today.some((cell) => cell.cell_id === mission.cell_id),
  );
}

function missionProgressOf(session: MockSession): MissionProgress[] {
  return missionsOf(session).map((mission) => ({
    mission_id: mission.mission_id,
    done: session.missions_done.has(mission.mission_id),
  }));
}

/** A cell's label, which is what the delta shows: labels, never ids. */
function labelOf(session: MockSession, cellId: string): string {
  const today = session.plan_today ?? PLAN_CARD.today;
  return today.find((cell) => cell.cell_id === cellId)?.label ?? cellId;
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
      requireStep(session, "items", "verification", "plan", "lesson");

      // Mock transition: asking for the first exercise after the plan card is
      // what starts the lesson. The real service starts it when the user
      // accepts the card, which is not a call this catalog has.
      if (session.flow.step === "plan") {
        session.flow.step = "lesson";
        session.queue = serveable(lessonSequence(), session.client);
      }

      const item = session.queue.shift();

      if (!item) {
        // Mock transition: the scripted list ran out. The real service stops
        // when it has enough, which is not something a list can express.
        switch (session.flow.step) {
          case "items":
            if (session.flow.mode === "zero") {
              // Mock rule: the shorter shape has no verification, lesson or
              // conversation; it goes straight to the result.
              session.flow.step = "verdict";
            } else {
              session.flow.step = "verification";
              session.queue = serveable(
                verificationSequence(PLAN_CARD.today),
                session.client,
              );
            }
            break;
          case "verification":
            session.flow.step = "plan";
            session.plan_today = [...PLAN_CARD.today];
            break;
          case "lesson":
            session.flow.step = "roleplay";
            break;
        }

        return {
          schema_version: SCHEMA_VERSION,
          item: null,
          flow: flowOf(session),
        };
      }

      session.served.set(item.item_id, item.instrument);
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
      requireStep(session, "kai_briefing", "lesson", "roleplay");

      return {
        schema_version: SCHEMA_VERSION,
        roleplay_bundle: {
          ...ROLEPLAY_BUNDLE,
          missions: missionsOf(session),
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

    async getDayPlan({ user_id }) {
      requireUser(user_id);
      return { schema_version: SCHEMA_VERSION, plan: DAY_PLAN };
    },

    async getDose({ user_id }) {
      requireUser(user_id);
      return { schema_version: SCHEMA_VERSION, dose: DOSE };
    },

    async getInterviewState({ session_id }) {
      const { interview } = requireSession(session_id);

      return {
        schema_version: SCHEMA_VERSION,
        state: {
          turn_count: interview.turns.length,
          last_turn: interview.turns.at(-1) ?? null,
          events: [...interview.events],
          closed: interview.closed,
          // Mock rule: where the conversation is, read back out of the events
          // rather than counted. The service knows its own stage; here the last
          // `stage_entered` is the only thing that does.
          stage: stageReached(interview.events),
          stages_total: INTERVIEW_STAGES,
          cards: cardsOnScreen(interview.events),
        },
        flow: flowOf(requireSession(session_id)),
      };
    },

    async getGoalV2({ user_id }) {
      return {
        schema_version: SCHEMA_VERSION,
        goal: goalV2Of(requireSessionOfUser(user_id)),
      };
    },

    async getPlanCard({ session_id }) {
      const session = requireSession(session_id);
      requireStep(
        session,
        "plan",
        "lesson",
        "roleplay",
        "delta",
        "verdict",
        "email",
        "home",
      );

      return {
        schema_version: SCHEMA_VERSION,
        plan: planCardOf(session),
        flow: flowOf(session),
      };
    },

    async getDelta({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "delta", "verdict", "email", "home");

      if (!session.delta) {
        throw new CoreError("NOT_FOUND", "this run has no conversation to close");
      }

      return {
        schema_version: SCHEMA_VERSION,
        delta: session.delta,
        flow: flowOf(session),
      };
    },

    // --- writes ---

    async createAnonymousUser() {
      return { schema_version: SCHEMA_VERSION, user_id: createUser().user_id };
    },

    async createSession({ user_id, client }) {
      // Mock transition: a run opens with the assistant's interview.
      const session = createSession(user_id, client, GOAL_V2.version);

      return {
        schema_version: SCHEMA_VERSION,
        session_id: session.session_id,
        flow: flowOf(session),
      };
    },

    async submitSurvey({ session_id, self_assessment, scope_areas }) {
      const session = requireSession(session_id);
      // Kept for runs that opened with the survey. During the interview it
      // still counts as a declaration, so an older client is not refused.
      requireStep(session, "survey", "talkeo_interview");

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
      requireStep(
        session,
        "survey",
        "kai_briefing",
        "talkeo_interview",
        "items",
        "verification",
        "plan",
        "lesson",
        "roleplay",
      );

      if (session.flow.step === "survey") {
        if (!session.scope) {
          throw new CoreError(
            "FLOW_MISMATCH",
            "the survey has not been submitted yet",
          );
        }
        // Mock transition of the earlier flow: answering the microphone
        // question was the last thing the opening screens asked for.
        session.flow.step = "kai_interview";
      } else if (session.flow.step === "kai_briefing") {
        // Mock transition of the earlier flow: the microphone was offered
        // once more before the exchange.
        session.flow.step = "roleplay";
      }
      // In the interview and after it, the answer is recorded and nothing
      // moves: the assistant asked, and it goes on either way.

      session.flow.mic_granted = granted;

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async logKaiTurn({ session_id, speaker }) {
      const session = requireSession(session_id);
      requireStep(session, "kai_interview", "kai_briefing", "talkeo_interview");

      // Mock transition of the earlier flow: the guide's own turn after the
      // card is signed was the goodbye. In the interview a logged turn is
      // just a logged turn; the assistant's own turns close it.
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

    async submitResponse({ session_id, item_id, response }) {
      const session = requireSession(session_id);
      requireStep(session, "items", "verification", "lesson");

      const instrument = session.served.get(item_id);
      if (!instrument) {
        throw new CoreError("BAD_ID", "item_id was never served");
      }

      // A meaning card is answered or swiped left; there is no passing.
      if (
        instrument === "meaning_card" &&
        !("dont_know" in response && response.dont_know === true) &&
        !("artefact" in response && response.artefact != null)
      ) {
        throw new CoreError(
          "INVALID_INPUT",
          "a meaning card is answered or swiped left, never passed",
        );
      }

      session.answered += 1;

      if (
        instrument === "lexical_yesno" &&
        "answer" in response &&
        session.opening_answers.length < OPENING_ITEM_COUNT
      ) {
        session.opening_answers.push(response.answer);
      }

      // Mock transition: the run changes shape once the opening items are in.
      // Mock rule: it does so when the user said they are just starting, or
      // knew none of the opening words. The real service decides from what
      // it measured, and nothing in this result says it happened — the change
      // reaches a screen only as `flow.mode`.
      if (
        session.flow.step === "items" &&
        session.flow.mode === "standard" &&
        session.answered === OPENING_ITEM_COUNT
      ) {
        const knewNone =
          session.opening_answers.length === OPENING_ITEM_COUNT &&
          session.opening_answers.every((answer) => answer === "no");

        if (session.self_assessment === "just_starting" || knewNone) {
          session.flow.mode = "zero";
          session.queue = serveable(zeroSequence(), session.client);
        }
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

      // Mock rule: each turn completes the next mission still open. The real
      // service hears whether the cell was used; a script cannot.
      const open = missionsOf(session).find(
        (mission) => !session.missions_done.has(mission.mission_id),
      );
      if (open) session.missions_done.add(open.mission_id);

      return {
        schema_version: SCHEMA_VERSION,
        reply: {
          artefact: session.flow.mic_granted
            ? ROLEPLAY_REPLY_AUDIO
            : { kind: "text", text: ROLEPLAY_BUNDLE.scenario.setup },
        },
        flow: flowOf(session),
        mission_progress: missionProgressOf(session),
      };
    },

    async endRoleplay({ session_id }) {
      const session = requireSession(session_id);
      requireStep(session, "roleplay");

      const missions = missionsOf(session);
      session.delta = {
        taught: missions.map((mission) => labelOf(session, mission.cell_id)),
        used: missions
          .filter((mission) => session.missions_done.has(mission.mission_id))
          .map((mission) => labelOf(session, mission.cell_id)),
      };

      // Mock transition: closing the conversation shows the delta.
      session.flow.step = "delta";

      return {
        schema_version: SCHEMA_VERSION,
        checks: ROLEPLAY_CHECKS,
        flow: flowOf(session),
        delta: session.delta,
      };
    },

    async attachIdentity({ user_id, email }) {
      const user = requireUser(user_id);
      const session = requireSessionOfUser(user_id);

      user.email = email;
      // Mock transition: leaving an email is the last thing the run asks for.
      session.flow.step = "home";

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async setDoseTarget({ user_id, target_session_minutes }) {
      requireUser(user_id);
      return {
        schema_version: SCHEMA_VERSION,
        dose: { ...DOSE_AFTER_TARGET, target_session_minutes },
      };
    },

    async setGoalOrder({ user_id, goal_ids }) {
      requireUser(user_id);
      return {
        schema_version: SCHEMA_VERSION,
        order: [...goal_ids],
        rango: RANGO_AFTER_REORDER,
      };
    },

    async talkeoTurn({ session_id }) {
      const session = requireSession(session_id);
      requireStep(
        session,
        "talkeo_interview",
        "items",
        "verification",
        "plan",
        "lesson",
        "roleplay",
      );

      let turn: TalkeoTurn;

      if (session.flow.step === "talkeo_interview") {
        // The recorded interview, replayed in order. What the user sends in
        // is not read: the assistant says what it said, which is the honest
        // limit of a fixture.
        turn = TALKEO_INTERVIEW_TURNS[session.interview.next]!;
        session.interview.next += 1;
        register(session, turn);

        if (turn.closing) {
          // Mock transition: the assistant's closing turn starts the exercises.
          session.interview.closed = true;
          session.flow.step = "items";
          session.queue = serveable(standardSequence(), session.client);
        }
      } else {
        // After the interview the assistant answers the step it is spoken to
        // in, without moving anything.
        turn =
          session.flow.step === "items"
            ? TALKEO_TURN_DURING_ITEMS
            : session.flow.step === "verification"
              ? TALKEO_TURN_LEVEL_EXPLAINED
              : TALKEO_TURN_PRE_ROLEPLAY;
        register(session, turn);
      }

      return {
        schema_version: SCHEMA_VERSION,
        turn,
        flow: flowOf(session),
      };
    },

    async attachArtefact({ session_id, kind, title }) {
      const session = requireSession(session_id);
      requireStep(session, "talkeo_interview");

      const artefact = {
        artefact_id: `af_mock_${session.artefacts.length + 1}`,
        kind,
        title: title ?? GOAL_ARTEFACT.title,
      };
      session.artefacts.push(artefact);
      session.interview.events.push(
        newEvent("artefact_attached", "declared", {
          artefact_id: artefact.artefact_id,
        }),
      );

      return {
        schema_version: SCHEMA_VERSION,
        artefact,
        flow: flowOf(session),
      };
    },

    async setScope({ session_id, areas, origin }) {
      const session = requireSession(session_id);
      requireStep(session, "talkeo_interview");

      if (areas.length === 0) {
        throw new CoreError(
          "INVALID_INPUT",
          'areas must be a non-empty list of areas or ["all"]',
        );
      }

      session.scope = { areas, version: (session.scope?.version ?? 0) + 1 };
      session.interview.events.push(
        newEvent("scope_set", origin ?? "declared", { areas }),
      );

      return {
        schema_version: SCHEMA_VERSION,
        scope: session.scope,
        flow: flowOf(session),
      };
    },

    async reportView({ session_id, event }) {
      const session = requireSession(session_id);

      // Mock transition: the two closing cards have nothing to submit, so
      // leaving one is what moves the run on. The real service decides on
      // its own clock.
      if (event === "card_left") {
        if (session.flow.step === "delta") session.flow.step = "verdict";
        else if (session.flow.step === "verdict") session.flow.step = "email";
      }

      return {
        schema_version: SCHEMA_VERSION,
        ok: true,
        flow: flowOf(session),
      };
    },

    async editPlanCard({ session_id, remove_cell_ids, add_labels }) {
      const session = requireSession(session_id);
      requireStep(session, "plan");

      const today = session.plan_today ?? [...PLAN_CARD.today];
      const removed = new Set(remove_cell_ids ?? []);

      session.plan_today = [
        ...today.filter((cell) => !removed.has(cell.cell_id)),
        ...(add_labels ?? []).map((label, index) => ({
          cell_id: `cell_mock_${today.length + index + 1}`,
          label,
          why: USER_ADDED_CELL_WHY,
        })),
      ];
      session.goal_version += 1;

      return {
        schema_version: SCHEMA_VERSION,
        plan: planCardOf(session),
        flow: flowOf(session),
      };
    },
  };
}
