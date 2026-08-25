import { z } from "zod";

/** A band, expressed as a floor and a ceiling per area rather than one value. */
export const bandSchema = z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);

export const areaVerdictSchema = z.object({
  /** The area this band belongs to. The level is a vector, never one number. */
  area: z.string(),
  /** The highest band the user sustains. */
  floor: bandSchema,
  /** Where they break. */
  ceiling: bandSchema,
  /** Plain-language reason, shown to the user. */
  note: z.string(),
});

export const verdictSchema = z.object({
  areas: z.array(areaVerdictSchema),
  /** What was not measured, stated out loud with its size. */
  unmeasured: z.string(),
  /** What the system attacks first, and why. */
  startingPoint: z.string(),
});

export type Band = z.infer<typeof bandSchema>;
export type AreaVerdict = z.infer<typeof areaVerdictSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
