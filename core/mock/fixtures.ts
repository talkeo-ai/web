import {
  goalSchema,
  itemSchema,
  roleplayBundleSchema,
  situationClassSchema,
  stateMapSchema,
  stateSummarySchema,
  type CheckOutcome,
  type Goal,
  type Instrument,
  type Item,
  type RoleplayBundle,
  type ServedAudio,
  type SituationClass,
  type StateMap,
  type StateSummary,
} from "../contracts";

import itemsFile from "./fixtures/items.json";
import roleplayFile from "./fixtures/roleplay.json";
import surveyKaiFile from "./fixtures/survey-kai.json";
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

export const STATE_MAP_STANDARD: StateMap = stateMapSchema.parse(
  verdictFile.get_state_map.standard.state_map,
);

export const STATE_MAP_ZERO: StateMap = stateMapSchema.parse(
  verdictFile.get_state_map.zero.state_map,
);
