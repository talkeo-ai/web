import { expect, test } from "@playwright/test";

/**
 * The headline is set to break in exactly two lines, in every locale, at every
 * width. That is not a property the CSS can assert about itself: it depends on
 * the copy, on the font's real metrics and on how wide the column ends up
 * being, so the only place it can be checked is a rendered page.
 *
 * A failure here means one of three things changed — a headline got longer, the
 * type scale moved, or the column narrowed. The fix is the same in all three:
 * re-measure the width a headline needs to halve, and set the size under it.
 */

// 360 is the floor this is designed for. Below it two lines would need a size
// small enough that the headline stops reading as one.
const WIDTHS = [360, 375, 414, 640, 768, 834, 1024, 1152, 1280, 1440, 1920];
const LOCALES = ["es", "en", "pt"];

test("the headline breaks in two lines in every locale, at every width", async ({
  page,
}) => {
  const wrong: string[] = [];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      const lines = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el: HTMLElement) =>
          Math.round(
            el.getBoundingClientRect().height /
              parseFloat(getComputedStyle(el).lineHeight),
          ),
        );
      if (lines !== 2) wrong.push(`${locale} at ${width}px: ${lines} lines`);
    }
  }

  expect(wrong, wrong.join("\n")).toEqual([]);
});

/**
 * Words that must not be left at the end of a line. They belong to what comes
 * after them, so a line ending on one reads as having been cut off rather than
 * as having ended.
 *
 * The English headline holds its break with a non-breaking space rather than a
 * forced one, so this is the assertion that says the break is still right: a
 * hard break would be self-evident in the copy, a non-breaking space is a
 * property of how the browser lays it out.
 */
const DANGLING =
  /\s(and|or|but|the|a|an|of|to|in|on|for|with|from|y|e|o|u|de|del|la|el|los|las|un|una|que|en|con|por|para|lo|do|da|os|as|um|uma)$/i;

test("no line of the headline ends on a word that belongs to the next", async ({
  page,
}) => {
  const bad: string[] = [];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of LOCALES) {
      await page.goto(`/${locale}`);
      // Walk the text a character at a time and group by vertical position:
      // there is no API that reports laid-out lines, and the copy has to be
      // read as rendered rather than as authored.
      const lines = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el: HTMLElement) => {
          const node = el.firstChild as Text;
          const text = node.textContent ?? "";
          const range = document.createRange();
          const acc: { top: number; text: string }[] = [];
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const top = range.getBoundingClientRect().top;
            let cur = acc[acc.length - 1];
            if (!cur || Math.abs(top - cur.top) > 2) {
              cur = { top, text: "" };
              acc.push(cur);
            }
            cur.text += text[i];
          }
          return acc.map((l) => l.text.trim());
        });

      // The last line ends the sentence, so it cannot dangle into anything.
      lines.slice(0, -1).forEach((line) => {
        if (DANGLING.test(line)) bad.push(`${locale} at ${width}px: "${line}"`);
      });
    }
  }

  expect(bad, bad.join("\n")).toEqual([]);
});

test("the headline keeps a readable size while it does it", async ({
  page,
}) => {
  // Two lines is cheap if the type is allowed to collapse, so the line count
  // above only means something next to a size the headline still reads at.
  for (const [width, min] of [
    [375, 20],
    [768, 30],
    [1024, 28],
    [1440, 30],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en");
    const size = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el: HTMLElement) => parseFloat(getComputedStyle(el).fontSize));
    expect(size, `${width}px viewport`).toBeGreaterThanOrEqual(min);
  }
});
