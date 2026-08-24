import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware navigation. Import `Link` and `redirect` from here, never from
 * `next/link` or `next/navigation`, so the locale prefix stays correct.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
