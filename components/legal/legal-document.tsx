import type { LegalDocument as Document } from "@/lib/legal";

/**
 * The shared shell for every legal page.
 *
 * The measure is set in `ch` rather than in pixels: what makes long prose
 * readable is how many characters fit on a line, and that follows the font
 * size — a fixed pixel width silently gets wider in characters every time the
 * type shrinks.
 *
 * It stops well short of the page container the header and footer use. Running
 * this text the full width would put well over a hundred characters on a line,
 * and the eye loses its place on the way back to the left margin. The cure for
 * a column that looks thin is a larger body size, not a wider column: both
 * push the pixel width out, but only one keeps the line findable.
 *
 * No back link of its own. The header floats above every page and its logo is
 * the way home, so a second one here would be two controls doing one job — and
 * the loose arrow above the title was the thing that made these pages look
 * unfinished.
 */
export function LegalDocument({ document }: { document: Document }) {
  return (
    <main className="mx-auto w-full max-w-[76ch] px-6 pt-32 pb-28 lg:px-8">
      <header className="border-border/60 border-b pb-8">
        <h1 className="text-foreground font-heading text-[30px] leading-[1.2] font-medium [font-stretch:96%] sm:text-[38px]">
          {document.title}
        </h1>
        <p className="text-text-tertiary mt-3 text-sm">{document.updated}</p>
      </header>

      {/* Sections carry more air between them than inside them, which is what
          lets the eye find the next heading without reading its way there. */}
      <div className="mt-12 space-y-11">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-foreground text-lg font-semibold">
              {section.heading}
            </h2>

            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="text-text-secondary mt-4 text-base leading-[1.75]"
              >
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="text-text-secondary marker:text-text-tertiary mt-3 list-disc space-y-2 pl-5 text-base leading-[1.75]">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
