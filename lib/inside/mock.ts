/**
 * What the inside shows, until the Core serves it.
 *
 * None of this exists in the Core yet: the streak, the daily dose and the
 * roadmap are mocked here so the screen can be iterated on (fin #120; #89,
 * #109). Every number below is made up.
 */

export type NodeState = "done" | "current" | "locked";

export type PathNode = {
  id: string;
  title: string;
  state: NodeState;
};

export type PathUnit = {
  id: string;
  title: string;
  subtitle: string;
  nodes: PathNode[];
};

export type Inside = {
  streakDays: number;
  doseMinutes: number;
  doseGoalMinutes: number;
  units: PathUnit[];
};

export const MOCK_INSIDE: Inside = {
  streakDays: 1,
  doseMinutes: 4,
  doseGoalMinutes: 10,
  units: [
    {
      id: "u1",
      title: "Presentarte en una entrevista",
      subtitle: "Unidad 1",
      nodes: [
        { id: "n1", title: "Quién sos", state: "done" },
        { id: "n2", title: "Qué hacés", state: "current" },
        { id: "n3", title: "Tu experiencia", state: "locked" },
        { id: "n4", title: "Preguntas difíciles", state: "locked" },
        { id: "n5", title: "Repaso", state: "locked" },
      ],
    },
    {
      id: "u2",
      title: "Hablar de tu trabajo",
      subtitle: "Unidad 2",
      nodes: [
        { id: "n6", title: "Tu día", state: "locked" },
        { id: "n7", title: "Tu equipo", state: "locked" },
        { id: "n8", title: "Un problema que resolviste", state: "locked" },
        { id: "n9", title: "Repaso", state: "locked" },
      ],
    },
  ],
};
