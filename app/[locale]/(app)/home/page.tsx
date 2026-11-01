import { Home } from "@/components/home/home";
import { MOCK_HOME } from "@/lib/inside/mock";

/**
 * The inside: where finishing or skipping the interview leads. Mock data until
 * the Core serves it (what is real and what is not: `lib/inside/mock.ts`).
 */
export default function HomePage() {
  return <Home home={MOCK_HOME} />;
}
