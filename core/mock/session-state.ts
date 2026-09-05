import {
  CoreError,
  type ClientDeclaration,
  type Delta,
  type Flow,
  type Goal,
  type GoalArtefact,
  type Instrument,
  type InterviewEvent,
  type Item,
  type PlanItem,
  type Scope,
  type SelfAssessment,
  type TalkeoTurn,
} from "../contracts";

/**
 * Where the mock keeps what it has been told.
 *
 * Two maps in module scope, so a run survives across requests inside one
 * process and nothing survives a restart. That is the whole storage story here
 * on purpose: this adapter exists so screens can be built before there is
 * anything to store into.
 */

export type MockUser = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  goals: Goal[];
  /** Reads keyed by user need to find the run they belong to. */
  last_session_id: string | null;
};

export type MockInterview = {
  /** How far into the recorded interview the assistant is. */
  next: number;
  turns: TalkeoTurn[];
  events: InterviewEvent[];
  closed: boolean;
};

export type MockSession = {
  session_id: string;
  user_id: string;
  client: ClientDeclaration;
  flow: Flow;
  self_assessment: SelfAssessment | null;
  scope: Scope | null;
  goal_signed: boolean;
  interview: MockInterview;
  /** What the interview registered as the goal, if it did. */
  goal_name: string | null;
  goal_version: number;
  artefacts: GoalArtefact[];
  /** The cells for today, once the plan card exists. Edits land here. */
  plan_today: PlanItem[] | null;
  /** What is left to serve, already filtered by what the client can draw. */
  queue: Item[];
  /** Ids handed out with their instrument, so an answer to something never served is rejected. */
  served: Map<string, Instrument>;
  answered: number;
  /** The yes/no answers to the opening items, in order. */
  opening_answers: ("yes" | "no")[];
  missions_done: Set<string>;
  delta: Delta | null;
};

const users = new Map<string, MockUser>();
const sessions = new Map<string, MockSession>();

function newId(): string {
  return crypto.randomUUID();
}

export function createUser(): MockUser {
  const user: MockUser = {
    user_id: newId(),
    display_name: null,
    email: null,
    goals: [],
    last_session_id: null,
  };
  users.set(user.user_id, user);
  return user;
}

export function requireUser(userId: string): MockUser {
  const user = users.get(userId);
  if (!user) throw new CoreError("BAD_ID", `unknown user_id: ${userId}`);
  return user;
}

export function createSession(
  userId: string,
  client: ClientDeclaration,
  goalVersion: number,
): MockSession {
  const user = requireUser(userId);

  const session: MockSession = {
    session_id: newId(),
    user_id: userId,
    client,
    flow: {
      step: "talkeo_interview",
      mode: "standard",
      mic_granted: false,
      display_name: user.display_name,
    },
    self_assessment: null,
    scope: null,
    goal_signed: false,
    interview: { next: 0, turns: [], events: [], closed: false },
    goal_name: null,
    goal_version: goalVersion,
    artefacts: [],
    plan_today: null,
    queue: [],
    served: new Map(),
    answered: 0,
    opening_answers: [],
    missions_done: new Set(),
    delta: null,
  };

  sessions.set(session.session_id, session);
  user.last_session_id = session.session_id;
  return session;
}

export function requireSession(sessionId: string): MockSession {
  const session = sessions.get(sessionId);
  if (!session) throw new CoreError("NOT_FOUND", "session_id not found");
  return session;
}

/** The run a user-keyed read belongs to. */
export function requireSessionOfUser(userId: string): MockSession {
  const user = requireUser(userId);
  if (!user.last_session_id) {
    throw new CoreError("NOT_FOUND", "user has no session");
  }
  return requireSession(user.last_session_id);
}

export function findGoal(user: MockUser, goalId: string): Goal {
  const goal = user.goals.find((candidate) => candidate.goal_id === goalId);
  if (!goal) throw new CoreError("BAD_ID", "goal_id does not exist");
  return goal;
}

/** Locates a goal without knowing whose it is, since edits carry only its id. */
export function findGoalOwner(goalId: string): MockUser {
  for (const user of users.values()) {
    if (user.goals.some((goal) => goal.goal_id === goalId)) return user;
  }
  throw new CoreError("BAD_ID", "goal_id does not exist");
}

export function nextGoalId(): string {
  return newId();
}

/** Drops everything. Tests call it so one run cannot leak into the next. */
export function resetMockStore(): void {
  users.clear();
  sessions.clear();
}
