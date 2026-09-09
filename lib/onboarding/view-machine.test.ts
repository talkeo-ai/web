/**
 * The rules of §6, one test each.
 *
 * This is the piece of the screen most likely to be got subtly wrong, and none
 * of it is visible from a component, so all of it is held here.
 */

import { describe, expect, it } from "vitest";

import {
  nextView,
  showsComposer,
  startingView,
  startsInFocus,
  type ViewState,
} from "./view-machine";

/** In the chat, having gone there on purpose. */
const inChat: ViewState = nextView(startsInFocus, {
  kind: "asked for",
  view: "chat",
});

describe("where the person starts", () => {
  it("starts in focus, which is the intuitive one", () => {
    expect(startsInFocus.view).toBe("focus");
  });

  it("starts a typist in the chat, because focus has no input for them", () => {
    expect(startingView("text").view).toBe("chat");
    expect(startingView("speak").view).toBe("focus");
  });

  it("settles the mode once and then leaves them alone", () => {
    // It rides on every turn. Applied every time, somebody who moved to the
    // chat would be taken back to focus on the next thing said.
    const speaking = startingView("speak");
    const moved = nextView(speaking, { kind: "asked for", view: "chat" });
    const later = nextView(moved, { kind: "answers by", mode: "speak" });
    expect(later.view).toBe("chat");
  });
});

describe("a surface asking for them while they are in the chat", () => {
  it("shows the surface alone, not the last thing said", () => {
    const pulled = nextView(inChat, { kind: "surface wants them" });
    expect(pulled.view).toBe("focus");
    expect(pulled.shows).toBe("the surface");
  });

  it("puts them back in the chat once they confirm", () => {
    const pulled = nextView(inChat, { kind: "surface wants them" });
    const touched = nextView(pulled, { kind: "touched the surface" });
    const done = nextView(touched, { kind: "confirmed the surface" });
    expect(done.view).toBe("chat");
  });

  it("leaves somebody who chose focus in focus when they confirm", () => {
    const touched = nextView(startsInFocus, { kind: "touched the surface" });
    const done = nextView(touched, { kind: "confirmed the surface" });
    expect(done.view).toBe("focus");
  });
});

describe("when the automatic switch stops", () => {
  it("stops after they are taken there and come back without touching it", () => {
    const pulled = nextView(inChat, { kind: "surface wants them" });
    const back = nextView(pulled, { kind: "asked for", view: "chat" });
    expect(back.autoSwitch).toBe(false);

    const again = nextView(back, { kind: "surface wants them" });
    expect(again.view).toBe("chat");
  });

  it("does not stop when they touched it and came back without confirming", () => {
    // They engaged with the surface and then chose where to be. Only ignoring
    // it outright says stop.
    const pulled = nextView(inChat, { kind: "surface wants them" });
    const touched = nextView(pulled, { kind: "touched the surface" });
    const back = nextView(touched, { kind: "asked for", view: "chat" });
    expect(back.autoSwitch).toBe(true);

    const again = nextView(back, { kind: "surface wants them" });
    expect(again.view).toBe("focus");
  });

  it("does not stop when they left a view they chose themselves", () => {
    const chose = nextView(startsInFocus, { kind: "asked for", view: "chat" });
    expect(chose.autoSwitch).toBe(true);
  });

  it("never starts again once it stopped", () => {
    const pulled = nextView(inChat, { kind: "surface wants them" });
    const off = nextView(pulled, { kind: "asked for", view: "chat" });
    const visited = nextView(off, { kind: "asked for", view: "focus" });
    const touched = nextView(visited, { kind: "touched the surface" });
    const left = nextView(touched, { kind: "asked for", view: "chat" });
    expect(left.autoSwitch).toBe(false);
  });
});

describe("the mark on the control", () => {
  it("goes up for somebody who turned the automatic switch off", () => {
    // The whole point of it: they still get told something changed, and still
    // get to go and look, without being taken there.
    const off = nextView(nextView(inChat, { kind: "surface wants them" }), {
      kind: "asked for",
      view: "chat",
    });
    const changed = nextView(off, { kind: "surface wants them" });
    expect(changed.unseen).toBe(1);
    expect(changed.view).toBe("chat");
  });

  it("counts every change until they look", () => {
    const off = nextView(nextView(inChat, { kind: "surface wants them" }), {
      kind: "asked for",
      view: "chat",
    });
    const twice = nextView(nextView(off, { kind: "surface wants them" }), {
      kind: "surface wants them",
    });
    expect(twice.unseen).toBe(2);
    expect(nextView(twice, { kind: "asked for", view: "focus" }).unseen).toBe(0);
  });

  it("never marks a view they are already looking at", () => {
    expect(nextView(startsInFocus, { kind: "surface wants them" }).unseen).toBe(
      0,
    );
  });
});

describe("the composer", () => {
  it("is drawn in the chat and not in focus", () => {
    expect(showsComposer(inChat)).toBe(true);
    expect(showsComposer(startsInFocus)).toBe(false);
  });
});
