/**
 * Which of the two views is up, and who decided.
 *
 * Focus is the default because it is the intuitive one: an English app puts
 * something in front of you and you pick. Chat is the whole thread, for somebody
 * who wants more than the last thing said.
 *
 * The hard part is not the switch, it is the automatic one. In chat, a surface
 * that needs attention pulls the view over to it — but somebody who went to the
 * chat deliberately did not ask for that, so it can only be done while it is
 * still welcome. The rule for when it stops:
 *
 * > Taken there, came back **without touching anything** → never taken again.
 * > Taken there, **touched it** and came back → still welcome.
 *
 * Touching and not confirming counts as welcome on purpose: they engaged with
 * the surface and then chose where to be. Only ignoring it outright says "stop".
 *
 * Everything here is a pure function of the state and one event. It is the piece
 * of this screen most likely to be got subtly wrong, so none of it lives in a
 * component.
 */

export type View = "chat" | "focus";

/** What focus is showing. */
export type FocusShows =
  /** The last thing said, and the surface if the stage has one. */
  | "the turn"
  /**
   * The surface alone.
   *
   * Only reached by being pulled out of the chat: they were reading the thread,
   * so the last turn is already in front of them and repeating it here would be
   * the same words twice.
   */
  | "the surface";

export type ViewState = {
  view: View;
  shows: FocusShows;
  /** Whether a surface may still pull the view over. Starts true. */
  autoSwitch: boolean;
  /** Whether they have touched the surface since it pulled them here. */
  touched: boolean;
  /** Surface updates they have not seen. Drives the mark on the control. */
  unseen: number;
  /**
   * The mode this state was started from, so it is only ever applied once.
   *
   * It arrives on every single turn, and a view that re-derived itself from it
   * each time would take somebody who moved to the chat straight back to focus
   * on the next thing said.
   */
  settledBy: string;
};

export const startsInFocus: ViewState = {
  view: "focus",
  shows: "the turn",
  autoSwitch: true,
  touched: false,
  unseen: 0,
  settledBy: "",
};

/** Somebody who answers by typing lives in the chat: focus has no input. */
export function startingView(mode: string): ViewState {
  return {
    ...startsInFocus,
    view: mode === "text" ? "chat" : "focus",
    settledBy: mode,
  };
}

export type ViewEvent =
  /** They pressed the control. */
  | { kind: "asked for"; view: View }
  /** A surface changed, or is asking to be filled. */
  | { kind: "surface wants them" }
  /** They typed in it, ticked something, moved something. */
  | { kind: "touched the surface" }
  /** They pressed the surface's confirm. */
  | { kind: "confirmed the surface" }
  /** The mode was settled, which decides where somebody starts. */
  | { kind: "answers by"; mode: string };

export function nextView(state: ViewState, event: ViewEvent): ViewState {
  switch (event.kind) {
    case "asked for": {
      // Going back to the chat off an automatic switch, having touched nothing,
      // is the one thing that turns the automatic switch off. They were shown
      // the surface and walked away from it.
      const ignoredIt =
        state.view === "focus" &&
        state.shows === "the surface" &&
        event.view === "chat" &&
        !state.touched;
      return {
        ...state,
        view: event.view,
        shows: "the turn",
        autoSwitch: state.autoSwitch && !ignoredIt,
        touched: false,
        // Reaching focus is seeing whatever was waiting there.
        unseen: event.view === "focus" ? 0 : state.unseen,
      };
    }

    case "surface wants them": {
      if (state.view === "focus") return { ...state, unseen: 0 };
      // The mark goes up either way — that is the whole point of it. Somebody
      // who turned the automatic switch off still gets told something changed
      // and still gets to go and look.
      const unseen = state.unseen + 1;
      if (!state.autoSwitch) return { ...state, unseen };
      return { ...state, view: "focus", shows: "the surface", touched: false, unseen: 0 };
    }

    case "touched the surface":
      return { ...state, touched: true };

    case "confirmed the surface":
      // Back where they were. Somebody pulled out of the chat goes back to it
      // rather than staying to watch the next turn in focus; somebody who chose
      // focus stays in focus.
      return state.shows === "the surface"
        ? { ...state, view: "chat", shows: "the turn", touched: false }
        : { ...state, touched: false };

    case "answers by":
      // Once, and only for a mode that is new. It rides on every turn, so
      // applying it every time would take somebody who moved to the chat back
      // to focus on the next thing said — which is the automatic switch they
      // are allowed to turn off, arriving through a door that does not have
      // that switch.
      if (!event.mode || event.mode === state.settledBy) return state;
      return { ...startingView(event.mode), unseen: state.unseen };
  }
}

/** Whether the composer is drawn at all. Focus has no input for a typist (§7). */
export function showsComposer(state: ViewState): boolean {
  return state.view === "chat";
}
