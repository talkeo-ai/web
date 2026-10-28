import { InsideScreen } from "@/components/inside/inside-screen";
import { MOCK_INSIDE } from "@/lib/inside/mock";

/**
 * The inside: where the onboarding's way out leads.
 *
 * Reads nothing request-dependent, so the whole route prerenders. When the Core
 * serves the real streak, dose and road, read them inside a child behind a
 * `<Suspense>` boundary, never at the top of this page.
 */
export default function HomePage() {
  return <InsideScreen inside={MOCK_INSIDE} />;
}
