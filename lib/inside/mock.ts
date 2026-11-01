/**
 * What the inside's home shows, shaped like what the Core serves or will serve,
 * so wiring it later is swapping this object for a request, not a redesign.
 *
 * Served today (read from the Core's contract, `contracts/v1.py`, 1/nov):
 * - `dose` is `get_dose` → `Dose`, field for field.
 * - `plan.blocks` is `get_day_plan` → `plan.blocks[]` (`PlanBlock`), trimmed to
 *   what the screen reads; `plan.bar.by_area` is its `AreaBar`.
 * - `goals` is `get_goal` → `goals[]`.
 * Not served yet, mocked here:
 * - `done` on a block: `PlanBlock` has no completion field.
 * - `cells` on a goal: "n de m casillas" (v5 D34) is declared pending in the
 *   plan's own bar note; a general goal has no bar at all, so it stays null.
 * - `week`: which of the last seven days had practice. Only `streak_days`.
 * - `road`: the units ahead. No endpoint (#109, open).
 * Every title and number below is made up.
 */

export type Area =
  | "conversation"
  | "pronunciation"
  | "vocabulary"
  | "grammar"
  | "listening"
  | "reading"
  | "writing";

export type Band = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** `get_dose` → `Dose`. */
export type Dose = {
  target_session_minutes: number;
  produced_minutes_today: number;
  assisted_minutes_today: number;
  streak_minutes: number;
  streak_days: number;
  deficit_minutes: number;
  weekly_blocks: number;
};

/** `get_day_plan` → `PlanBlock`, plus the mocked `done`. */
export type PlanBlock = {
  index: number;
  kind: "speak" | "write" | "listen" | "read" | "review";
  area: Area;
  objective: string;
  minutes: number;
  is_warmup: boolean;
  done: boolean;
};

/** `get_day_plan` → `bar.by_area[]`. Shares are 0..1; gray is what is unmeasured. */
export type AreaBar = {
  area: Area;
  band: Band | null;
  measured_share: number;
  gray_share: number;
};

/** `get_goal` → `Goal`, plus the mocked `cells`. */
export type Goal = {
  goal_id: string;
  kind: "main" | "micro";
  status: "draft" | "active" | "completed";
  name: string;
  focus: string | null;
  /** Mocked: n of m cells used. Null for a general goal, which has no bar. */
  cells: { used: number; total: number } | null;
};

export type RoadNode = { id: string; title: string; state: "done" | "today" | "next"; minutes: number };
export type RoadUnit = { id: string; title: string; goal: string; nodes: RoadNode[] };

export type Home = {
  name: string;
  /** Which of the last seven days, oldest first, had practice. Mocked. */
  week: boolean[];
  dose: Dose;
  plan: { title: string; goal: string; blocks: PlanBlock[]; bar: AreaBar[] };
  goals: Goal[];
  road: RoadUnit[];
  /** No account yet: the ask stays on the page without blocking it. */
  saved: boolean;
};

export const MOCK_HOME: Home = {
  name: "Joaquin",
  week: [true, false, true, true, false, true, false],
  dose: {
    target_session_minutes: 15,
    produced_minutes_today: 4,
    assisted_minutes_today: 2,
    streak_minutes: 46,
    streak_days: 3,
    deficit_minutes: 11,
    weekly_blocks: 9,
  },
  plan: {
    title: "Contá qué hacés",
    goal: "Entrevista de trabajo",
    blocks: [
      { index: 0, kind: "review", area: "vocabulary", objective: "Repasá las palabras de ayer", minutes: 2, is_warmup: true, done: true },
      { index: 1, kind: "listen", area: "listening", objective: "Escuchá cómo se presenta alguien", minutes: 3, is_warmup: false, done: true },
      { index: 2, kind: "speak", area: "conversation", objective: "Contá quién sos y qué hacés", minutes: 4, is_warmup: false, done: false },
      { index: 3, kind: "write", area: "writing", objective: "Escribí tu presentación en tres frases", minutes: 3, is_warmup: false, done: false },
      { index: 4, kind: "speak", area: "pronunciation", objective: "Decí tu puesto como un nativo", minutes: 3, is_warmup: false, done: false },
    ],
    bar: [
      { area: "conversation", band: "B1", measured_share: 0.42, gray_share: 0.58 },
      { area: "vocabulary", band: "B1", measured_share: 0.71, gray_share: 0.29 },
      { area: "grammar", band: "A2", measured_share: 0.38, gray_share: 0.62 },
      { area: "listening", band: "B2", measured_share: 0.55, gray_share: 0.45 },
      { area: "reading", band: "B1", measured_share: 0.24, gray_share: 0.76 },
      { area: "pronunciation", band: null, measured_share: 0, gray_share: 1 },
      { area: "writing", band: null, measured_share: 0, gray_share: 1 },
    ],
  },
  goals: [
    { goal_id: "g1", kind: "main", status: "active", name: "Entrevista de trabajo", focus: "Desarrollador en una empresa de afuera", cells: { used: 14, total: 44 } },
    { goal_id: "g2", kind: "main", status: "active", name: "Reuniones con el equipo", focus: "Daily y retros en inglés", cells: { used: 6, total: 38 } },
    { goal_id: "g3", kind: "main", status: "active", name: "Series sin subtítulos", focus: null, cells: null },
  ],
  road: [
    {
      id: "u1",
      title: "Presentarte",
      goal: "Entrevista de trabajo",
      nodes: [
        { id: "n1", title: "Saludar y romper el hielo", state: "done", minutes: 12 },
        { id: "n2", title: "Quién sos", state: "done", minutes: 12 },
        { id: "n3", title: "Qué hacés", state: "today", minutes: 15 },
        { id: "n4", title: "Tu experiencia", state: "next", minutes: 14 },
        { id: "n5", title: "Preguntas difíciles", state: "next", minutes: 15 },
      ],
    },
    {
      id: "u2",
      title: "Hablar de tu trabajo",
      goal: "Reuniones con el equipo",
      nodes: [
        { id: "n6", title: "Tu día", state: "next", minutes: 12 },
        { id: "n7", title: "Dar una actualización", state: "next", minutes: 12 },
        { id: "n8", title: "Un problema que resolviste", state: "next", minutes: 15 },
        { id: "n9", title: "Pedir que te repitan", state: "next", minutes: 10 },
      ],
    },
  ],
  saved: false,
};
