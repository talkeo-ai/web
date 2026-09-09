import { describe, expect, it } from "vitest";

import { splitWords } from "@/lib/talkeo/lines";
import { stripVoiceTags } from "@/lib/talkeo/voice-tags";

describe("stripping the delivery marks", () => {
  it("leaves a turn without them alone", () => {
    const plain = "Hola, soy Talkeo. ¿Preferís hablar o escribir?";

    expect(stripVoiceTags(plain)).toEqual({ text: plain, tags: [] });
  });

  it("takes them out and repairs the spacing they leave behind", () => {
    const { text } = stripVoiceTags("[warm] Hola, soy [pause] Talkeo.");

    expect(text).toBe("Hola, soy Talkeo.");
  });

  it("keeps the word count the timings are numbered against", () => {
    const spoken = "Hola, soy Talkeo. ¿Preferís hablar o escribir?";
    const tagged = "[warm] Hola, soy Talkeo. [pause] ¿Preferís hablar o escribir?";

    // The whole point: two more tokens in the raw string would push every
    // index after the first tag out by one, and a mark would fire on the
    // wrong word.
    expect(splitWords(stripVoiceTags(tagged).text)).toEqual(splitWords(spoken));
  });

  it("numbers each tag against the word it sits in front of", () => {
    const { tags } = stripVoiceTags("[warm] Hola, soy [pause] Talkeo.");

    expect(tags).toEqual([
      { name: "warm", wordIndex: 0 },
      { name: "pause", wordIndex: 2 },
    ]);
  });

  it("does not eat brackets that are part of what is being said", () => {
    const aside = "Se dice «handover [en inglés]», no «hand over».";

    expect(stripVoiceTags(aside).text).toBe(aside);
  });
});
