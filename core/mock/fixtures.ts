import {
  dayPlanSchema,
  doseSchema,
  goalArtefactSchema,
  goalSchema,
  goalV2Schema,
  itemSchema,
  planCardSchema,
  rangoSchema,
  roleplayBundleSchema,
  situationClassSchema,
  stateMapSchema,
  stateSummarySchema,
  talkeoTurnSchema,
  type CheckOutcome,
  type DayPlan,
  type Dose,
  type Goal,
  type GoalArtefact,
  type GoalV2,
  type Instrument,
  type Item,
  type PlanCard,
  type Rango,
  type RoleplayBundle,
  type ServedAudio,
  type SituationClass,
  type StateMap,
  type StateSummary,
  type TalkeoTurn,
} from "../contracts";

import goalV2File from "./fixtures/goal-v2.json";
import itemsFile from "./fixtures/items.json";
import planCardFile from "./fixtures/plan-card.json";
import planFile from "./fixtures/plan.json";
import roleplayFile from "./fixtures/roleplay.json";
import surveyKaiFile from "./fixtures/survey-kai.json";
import talkeoFile from "./fixtures/talkeo.json";
import verdictFile from "./fixtures/verdict.json";

/**
 * The recorded answers of the service, parsed into the types this app uses.
 *
 * These files are copied verbatim from the service's own contract fixtures and
 * every value in them is synthetic. Parsing happens at import rather than in a
 * test so drift is loud: if the contract changes shape and these are refreshed
 * without updating the schemas, nothing that imports this module starts.
 *
 * The text inside is content the service serves for a run in a given language,
 * which is why Spanish appears here and not in `messages/`. It is data, not
 * interface copy.
 */

const itemCatalog = itemsFile.get_next_item as Record<
  string,
  { item?: unknown }
>;

/** One recorded item per instrument, keyed by instrument. */
export const ITEM_BY_INSTRUMENT = Object.fromEntries(
  Object.values(itemCatalog)
    .filter((entry): entry is { item: unknown } => entry.item != null)
    .map((entry) => {
      const item = itemSchema.parse(entry.item);
      return [item.instrument, item] as const;
    }),
) as Record<Instrument, Item>;

export const SITUATION_CLASSES: SituationClass[] =
  surveyKaiFile.get_situation_classes.classes.map((entry) =>
    situationClassSchema.parse(entry),
  );

export const GOAL_DRAFT: Goal = goalSchema.parse(
  surveyKaiFile.create_goal_draft.goal,
);

export const STATE_SUMMARY: StateSummary = stateSummarySchema.parse(
  surveyKaiFile.get_state_summary.state_summary,
);

// --- the assistant's interview ---

const interviewTurns = talkeoFile.talkeo_turn;

/**
 * The interview as recorded, in the order the assistant says it.
 *
 * It starts at the scope, not at a welcome. The name and how they want to
 * answer are asked before the conversation, by the two screens that lead into
 * it, so there is nothing left for the assistant to open with — and a fixture
 * that greeted them anyway would be asking twice.
 */
export const TALKEO_INTERVIEW_TURNS: TalkeoTurn[] = [
  interviewTurns.entrance_name,
  interviewTurns.entrance_mode,
  interviewTurns.scope_open,
  interviewTurns.scope_confirmed,
  interviewTurns.goal_drafted,
  interviewTurns.goals_more,
  interviewTurns.history,
  interviewTurns.about_you,
  interviewTurns.closing,
].map((entry) => talkeoTurnSchema.parse(entry.turn));

/** What the assistant says when spoken to while an exercise is on screen. */
export const TALKEO_TURN_DURING_ITEMS: TalkeoTurn = talkeoTurnSchema.parse(
  interviewTurns.during_items_belief.turn,
);

/** The turn that opens the verification, once the measuring is done. */
export const TALKEO_TURN_LEVEL_EXPLAINED: TalkeoTurn = talkeoTurnSchema.parse(
  interviewTurns.level_explained.turn,
);

/** The turn that hands over to the conversation. */
export const TALKEO_TURN_PRE_ROLEPLAY: TalkeoTurn = talkeoTurnSchema.parse(
  interviewTurns.pre_roleplay.turn,
);

export const GOAL_ARTEFACT: GoalArtefact = goalArtefactSchema.parse(
  talkeoFile.attach_artefact.artefact,
);

// --- the goal and the plan card ---

export const GOAL_V2: GoalV2 = goalV2Schema.parse(goalV2File.get_goal_v2.goal);

export const PLAN_CARD: PlanCard = planCardSchema.parse(
  planCardFile.get_plan_card.plan,
);

const editedPlanCard: PlanCard = planCardSchema.parse(
  planCardFile.edit_plan_card.plan,
);

/** The one line the service says about a cell the user added by hand. */
export const USER_ADDED_CELL_WHY: string = editedPlanCard.today.find(
  (item) => !PLAN_CARD.today.some((known) => known.cell_id === item.cell_id),
)!.why;

// --- the conversation ---

export const ROLEPLAY_BUNDLE: RoleplayBundle = roleplayBundleSchema.parse(
  roleplayFile.get_roleplay_bundle.standard.roleplay_bundle,
);

export const ROLEPLAY_BUNDLE_CODE_SWITCHING: RoleplayBundle =
  roleplayBundleSchema.parse(
    roleplayFile.get_roleplay_bundle.code_switching.roleplay_bundle,
  );

export const ROLEPLAY_REPLY_AUDIO: ServedAudio = {
  kind: "audio",
  url: roleplayFile.roleplay_turn.reply.artefact.url,
};

export const ROLEPLAY_CHECKS: CheckOutcome[] = roleplayFile.end_roleplay.checks;

// --- the result screen ---

export const STATE_MAP_STANDARD: StateMap = stateMapSchema.parse(
  verdictFile.get_state_map.standard.state_map,
);

export const STATE_MAP_ZERO: StateMap = stateMapSchema.parse(
  verdictFile.get_state_map.zero.state_map,
);

// --- the day plan and the dose ---

export const DAY_PLAN: DayPlan = dayPlanSchema.parse(
  planFile.get_day_plan.standard.plan,
);

export const DAY_PLAN_FLOOR_BREACH: DayPlan = dayPlanSchema.parse(
  planFile.get_day_plan.floor_breach.plan,
);

export const DOSE: Dose = doseSchema.parse(planFile.get_dose.dose);

/** The dose as the service reports it right after the target changed. */
export const DOSE_AFTER_TARGET: Dose = doseSchema.parse(
  planFile.set_dose_target.dose,
);

export const RANGO_AFTER_REORDER: Rango = rangoSchema.parse(
  planFile.set_goal_order.rango,
);
