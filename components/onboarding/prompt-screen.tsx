import type { ReactNode } from "react";

/**
 * One question, and nothing else on the page.
 *
 * The two screens before the conversation share this: the question in the
 * optical centre and the single control under it. Anything else — a mark, a
 * progress bar, a back link, a second call to action — turns being asked
 * something into filling something in.
 *
 * The question sits above the true centre because the answer is what the eye
 * has to land on, and a block centred on its own bounding box reads low.
 */
export function PromptScreen({
  question,
  hint,
  children,
  footer,
}: {
  question: string;
  hint?: string;
  /** The control that answers it. */
  children: ReactNode;
  /** The way out, if there is one. Quiet by design. */
  footer?: ReactNode;
}) {
  return (
    <main
      data-slot="prompt-screen"
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-[8vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
            {question}
          </h1>
          {hint ? <p className="text-text-secondary">{hint}</p> : null}
        </div>

        <div className="flex w-full flex-col items-center gap-5">
          {children}
          {footer}
        </div>
      </div>
    </main>
  );
}
