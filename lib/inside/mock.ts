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
 * - `words`: the word store summed up and a sample cell by cell. No endpoint.
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

/**
 * `get_day_plan` → `PlanBlock`, plus the mocked `done`. `surface` stands for
 * the Core's `surface_id`, but points into the catalog below (`surfaces[].id`):
 * the Core's ids (`roleplay`, `write_and_correct`, …) and the catalog's names
 * are not mapped to each other yet.
 */
export type PlanBlock = {
  index: number;
  kind: "speak" | "write" | "listen" | "read" | "review";
  area: Area;
  surface: string;
  objective: string;
  minutes: number;
  is_warmup: boolean;
  done: boolean;
};

/**
 * One cell of a word: 0 not measured, 1 known, 2 not known, 3 partly
 * (ARQUITECTURA-V5 §5 bis). A word has 18: three blocks (form, meaning, use),
 * three aspects each, recognising and producing.
 */
export type Cell = 0 | 1 | 2 | 3;
export type WordState = { word: string; band: Band; cells: Cell[] };
/** Words per CEFR band by their overall state. Mocked: no endpoint serves this. */
export type WordBand = { band: Band; known: number; partly: number; unknown: number; unmeasured: number };

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

/**
 * `get_state_map` → `areas[]` (the Core answers 501 today, so mocked): the
 * band range the area sits in, floor to ceiling, and how much of it is
 * measured. The width of the range is the uncertainty.
 */
export type AreaState = {
  area: Area;
  floor: Band;
  ceiling: Band;
  measured_pct: number;
};

export type StateMap = {
  /** `headline`: one estimate with its confidence, beside the areas, never instead of them. */
  headline: { level_estimate: Band; confidence_pct: number };
  areas: AreaState[];
};

export type SurfaceGroup = "speak" | "write" | "listen" | "play" | "tools" | "people";

/**
 * One way to practise. A catalog the Core does not serve yet: the names are
 * the landing's (`components/landing/surfaces.ts`) plus the games and tools
 * Joaquin listed (1/nov). `soon` is what is not built.
 */
export type SurfaceItem = {
  id: string;
  group: SurfaceGroup;
  title: string;
  line: string;
  minutes: number | null;
  soon?: boolean;
  /** Where it opens today, when it does. */
  href?: string;
};

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
  state: StateMap;
  /** Minutes produced per day, the last 28, oldest first. Mocked. */
  activity: number[];
  surfaces: SurfaceItem[];
  /** The word store, summed up: every band, and a sample of words cell by cell. Mocked. */
  words: { bands: WordBand[]; sample: WordState[] };
};

/** "131111113100131100" → the 18 cells, in the order of `CELL_COLUMNS`. */
const cells = (s: string) => s.split("").map(Number) as Cell[];

/**
 * Talkeo's side of the chat, scripted until the chat is wired to the
 * conversation service: the opening line, three suggestions and their answers,
 * and what it says to anything else. Spanish only, like the rest of the mock.
 */
export const MOCK_TALKEO = {
  greeting: (home: Home) =>
    `Hola, ${home.name}. Hoy toca "${home.plan.title}" para tu ${home.plan.goal.toLowerCase()}. Cuando quieras arrancamos, o preguntame lo que necesites.`,
  suggestions: [
    {
      ask: "Empezar la clase",
      answer:
        "Dale. Ya hiciste el repaso y la escucha; sigue contar quién sos y qué hacés, en voz alta. Son 4 minutos: tocá Seguir cuando estés.",
    },
    {
      ask: "¿Por qué esto hoy?",
      answer:
        "Porque en una entrevista lo primero que te piden es presentarte, y ayer dudaste justo ahí: los tiempos verbales al contar tu experiencia.",
    },
    {
      ask: "¿Cómo voy?",
      answer:
        "Llevás 14 de 44 de lo que vas a necesitar para la entrevista. Vocabulario es tu fuerte (B1); pronunciación y escritura todavía no las medimos.",
    },
  ],
  fallback: "Anotado. (Respuesta de prueba: cuando conectemos el chat, acá te contesto de verdad.)",
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
      { index: 0, kind: "review", area: "vocabulary", surface: "review", objective: "Repasá las palabras de ayer", minutes: 2, is_warmup: true, done: true },
      { index: 1, kind: "listen", area: "listening", surface: "podcast", objective: "Escuchá cómo se presenta alguien", minutes: 3, is_warmup: false, done: true },
      { index: 2, kind: "speak", area: "conversation", surface: "roleplay", objective: "Contá quién sos y qué hacés", minutes: 4, is_warmup: false, done: false },
      { index: 3, kind: "write", area: "writing", surface: "writeAndFix", objective: "Escribí tu presentación en tres frases", minutes: 3, is_warmup: false, done: false },
      { index: 4, kind: "speak", area: "pronunciation", surface: "pronunciation", objective: "Decí tu puesto como un nativo", minutes: 3, is_warmup: false, done: false },
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
  state: {
    headline: { level_estimate: "B1", confidence_pct: 62 },
    areas: [
      { area: "conversation", floor: "A2", ceiling: "B1", measured_pct: 42 },
      { area: "vocabulary", floor: "B1", ceiling: "B1", measured_pct: 71 },
      { area: "grammar", floor: "A2", ceiling: "B1", measured_pct: 38 },
      { area: "listening", floor: "B1", ceiling: "B2", measured_pct: 55 },
      { area: "reading", floor: "A2", ceiling: "B2", measured_pct: 24 },
      { area: "pronunciation", floor: "A1", ceiling: "B2", measured_pct: 0 },
      { area: "writing", floor: "A1", ceiling: "B2", measured_pct: 0 },
    ],
  },
  activity: [0, 8, 12, 0, 15, 9, 0, 0, 14, 16, 11, 0, 7, 0, 12, 18, 0, 10, 15, 13, 0, 6, 0, 12, 14, 0, 16, 4],
  surfaces: [
    { id: "call", group: "speak", title: "Llamada con Talkeo", line: "Hablá en voz alta sobre lo que te importa", minutes: 10 },
    { id: "roleplay", group: "speak", title: "Role-play", line: "Una entrevista, una reunión, un café: lo ensayás antes", minutes: 8 },
    { id: "pronunciation", group: "speak", title: "Pronunciación", line: "Los sonidos que te cuestan, uno por uno", minutes: 5 },
    { id: "shadowing", group: "speak", title: "Shadowing", line: "Repetí detrás de un nativo, al mismo ritmo", minutes: 5 },
    { id: "readAloud", group: "speak", title: "Leer en voz alta", line: "Un texto tuyo, leído y corregido", minutes: 5 },
    { id: "chat", group: "write", title: "Chat escrito", line: "La misma charla, escribiendo", minutes: 8 },
    { id: "writeAndFix", group: "write", title: "Escribir y corregir", line: "Un mail o un mensaje, con cada arreglo explicado", minutes: 6 },
    { id: "fillTheGap", group: "write", title: "Completar el hueco", line: "Frases tuyas con la palabra justa", minutes: 4 },
    { id: "dictation", group: "listen", title: "Dictado", line: "Escuchás, escribís, ves qué se te escapó", minutes: 5 },
    { id: "yourContent", group: "listen", title: "Tu contenido", line: "Series, videos o podcasts que ya mirás", minutes: 10 },
    { id: "podcast", group: "listen", title: "Escucha guiada", line: "Audios cortos a tu nivel, con preguntas", minutes: 6 },
    { id: "swipe", group: "play", title: "Deslizar palabras", line: "¿La conocés o no? Cada respuesta afina tu nivel", minutes: 2, href: "/level" },
    { id: "order", group: "play", title: "Ordenar la frase", line: "Las palabras mezcladas, armalas", minutes: 3 },
    { id: "pairs", group: "play", title: "Pares", line: "Palabra y significado, contra el reloj", minutes: 3 },
    { id: "review", group: "play", title: "Repaso", line: "Lo que estás por olvidar, justo a tiempo", minutes: 4 },
    { id: "liveTranscribe", group: "tools", title: "Transcripción en vivo", line: "Lo que se dice en una llamada, escrito al instante", minutes: null, soon: true },
    { id: "subtitles", group: "tools", title: "Subtítulos", line: "Subtítulos en inglés sobre cualquier video", minutes: null, soon: true },
    { id: "translate", group: "tools", title: "Traducir y mejorar", line: "Un texto tuyo, mejor dicho, en cualquier app", minutes: null, soon: true },
    { id: "agents", group: "tools", title: "Agentes", line: "Talkeo hace un trámite en inglés con vos", minutes: null, soon: true },
    { id: "realPeople", group: "people", title: "Con gente real", line: "Una charla con otra persona que aprende", minutes: 15, soon: true },
    { id: "tutor", group: "people", title: "Con un profesor", line: "Una clase con alguien que ya ve tu progreso", minutes: 30, soon: true },
  ],
  words: {
    bands: [
      { band: "A1", known: 640, partly: 120, unknown: 20, unmeasured: 40 },
      { band: "A2", known: 610, partly: 260, unknown: 70, unmeasured: 160 },
      { band: "B1", known: 380, partly: 420, unknown: 180, unmeasured: 520 },
      { band: "B2", known: 140, partly: 310, unknown: 230, unmeasured: 1020 },
      { band: "C1", known: 30, partly: 90, unknown: 120, unmeasured: 1160 },
      { band: "C2", known: 0, partly: 20, unknown: 40, unmeasured: 1140 },
    ],
    sample: [
      { word: "meeting", band: "A2", cells: cells("131111113100131100") },
      { word: "decision", band: "A2", cells: cells("131111111300130300") },
      { word: "schedule", band: "B1", cells: cells("321311133000330000") },
      { word: "achieve", band: "B1", cells: cells("131311132000300000") },
      { word: "issue", band: "B1", cells: cells("031111330300232000") },
      { word: "though", band: "B1", cells: cells("232131320000230000") },
      { word: "deploy", band: "B2", cells: cells("231111132000330000") },
      { word: "concern", band: "B2", cells: cells("031331323000200000") },
      { word: "rough", band: "B2", cells: cells("232312233000020000") },
      { word: "leverage", band: "C1", cells: cells("220302220000000000") },
      { word: "insight", band: "C1", cells: cells("020002300000000000") },
      { word: "cumbersome", band: "C2", cells: cells("000000200000000000") },
    ],
  },
};
