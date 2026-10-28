/**
 * What the inside's home shows, until the Core serves it.
 *
 * None of this exists in the Core yet: goals, the day's plan and the road are
 * mocked so the screen can be iterated on (fin #120; #89, #109). Every number
 * and title below is made up.
 */

export type Goal = {
  id: string;
  title: string;
  /** 0..1 */
  progress: number;
};

/** How the step is practised: what the learner will be doing with the app. */
export type PlanStepKind = "voice" | "writing" | "listening" | "reading";

export type PlanStep = {
  id: string;
  kind: PlanStepKind;
  title: string;
  minutes: number;
  done: boolean;
};

/** One session on the road. Exactly one is `today`, and it carries the plan. */
export type RoadNode = {
  id: string;
  title: string;
  state: "done" | "today" | "next";
  /** For done sessions: when it was done. */
  when?: string;
  minutes: number;
  kinds: PlanStepKind[];
};

export type RoadUnit = {
  id: string;
  title: string;
  nodes: RoadNode[];
};

export type Home = {
  streakDays: number;
  minutesToday: number;
  minutesGoal: number;
  goals: Goal[];
  /** The steps of the road's `today` session. */
  plan: PlanStep[];
  road: RoadUnit[];
};

export const MOCK_HOME: Home = {
  streakDays: 3,
  minutesToday: 4,
  minutesGoal: 18,
  goals: [
    { id: "g1", title: "Entrevista de trabajo", progress: 0.32 },
    { id: "g2", title: "Reuniones con el equipo", progress: 0.18 },
    { id: "g3", title: "Viaje a Londres", progress: 0.05 },
  ],
  plan: [
    { id: "s1", kind: "listening", title: "Escuchá cómo se presenta alguien", minutes: 2, done: true },
    { id: "s2", kind: "writing", title: "Escribí tres frases sobre vos", minutes: 2, done: true },
    { id: "s3", kind: "voice", title: "Contá quién sos y qué hacés", minutes: 4, done: false },
    { id: "s4", kind: "reading", title: "Leé una oferta de trabajo", minutes: 3, done: false },
    { id: "s5", kind: "voice", title: "Respondé por qué querés el puesto", minutes: 4, done: false },
    { id: "s6", kind: "listening", title: "Repasá lo que te costó", minutes: 3, done: false },
  ],
  road: [
    {
      id: "u0",
      title: "Primeros pasos",
      nodes: [
        { id: "n01", title: "Lo que ya sabés", state: "done", when: "Hace 2 semanas", minutes: 8, kinds: ["listening"] },
        { id: "n02", title: "Tus primeras frases", state: "done", when: "Hace 10 días", minutes: 10, kinds: ["voice"] },
        { id: "n03", title: "Escuchar sin traducir", state: "done", when: "Hace una semana", minutes: 10, kinds: ["listening", "reading"] },
      ],
    },
    {
      id: "u1",
      title: "Presentarte en una entrevista",
      nodes: [
        { id: "n1", title: "Saludar y romper el hielo", state: "done", when: "Lunes", minutes: 10, kinds: ["listening", "voice"] },
        { id: "n2", title: "Quién sos", state: "done", when: "Ayer", minutes: 12, kinds: ["writing", "voice"] },
        { id: "n3", title: "Qué hacés", state: "today", minutes: 12, kinds: ["writing", "voice", "listening"] },
        { id: "n4", title: "Tu experiencia", state: "next", minutes: 14, kinds: ["reading", "voice"] },
        { id: "n5", title: "Preguntas difíciles", state: "next", minutes: 15, kinds: ["listening", "voice"] },
      ],
    },
    {
      id: "u2",
      title: "Hablar de tu trabajo",
      nodes: [
        { id: "n6", title: "Tu día", state: "next", minutes: 10, kinds: ["voice"] },
        { id: "n7", title: "Tu equipo", state: "next", minutes: 12, kinds: ["listening", "writing"] },
        { id: "n8", title: "Un problema que resolviste", state: "next", minutes: 15, kinds: ["voice", "writing"] },
      ],
    },
    {
      id: "u3",
      title: "Reuniones con el equipo",
      nodes: [
        { id: "n9", title: "Dar una actualización", state: "next", minutes: 12, kinds: ["voice"] },
        { id: "n10", title: "Pedir que te repitan", state: "next", minutes: 10, kinds: ["listening", "voice"] },
        { id: "n11", title: "No estar de acuerdo", state: "next", minutes: 14, kinds: ["voice", "writing"] },
        { id: "n12", title: "Cerrar con próximos pasos", state: "next", minutes: 12, kinds: ["writing", "reading"] },
      ],
    },
  ],
};
