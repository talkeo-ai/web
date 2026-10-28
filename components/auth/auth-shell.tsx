import type { ReactNode } from "react";

import { Link } from "@/lib/i18n/navigation";

/**
 * The frame of the account screens, after the old Talkeo's sign-in: one narrow
 * column in the middle of the page, no card and no bar. The name is the title
 * and the way home, so nothing sits above the column to push it off centre
 * (Joaquin, 28/oct, on two earlier versions: no card, no header with the logo).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        <Link
          href="/"
          prefetch={false}
          className="focus-key:ring-ring inline-block rounded-lg outline-none focus-key:ring-2"
        >
          <h1 className="font-heading text-foreground text-[30px] leading-[38px] font-semibold tracking-[-0.02em] sm:text-[38px] sm:leading-[48px]">
            Talkeo
          </h1>
        </Link>
        <div className="mt-2">{children}</div>
      </div>
    </main>
  );
}
