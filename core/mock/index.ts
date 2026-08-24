import type { CorePort } from "../port";
import type { OnboardingState, Verdict } from "../contracts";

/**
 * The adapter that answers while the Core has no HTTP door (it arrives in stage
 * E9).
 *
 * The fixtures are not invented: they are the ones already written and reviewed
 * in the Core's own flow simulator (`lab/cerebro/prototipos/simulador`), so what
 * the UI is built against is what the Core is designed to produce.
 */

const VERDICT: Verdict = {
  areas: [
    {
      area: "Hablando",
      floor: "A2",
      ceiling: "B1",
      note: "te rompés en pasados al narrar y en el arranque de cada respuesta",
    },
    {
      area: "Escribiendo",
      floor: "A2",
      ceiling: "A2",
      note: "la -s de 3ª falla en habla y escritura — señal fuerte, no casualidad",
    },
    {
      area: "Entendiendo",
      floor: "B1",
      ceiling: "B2",
      note: "tu mejor área — y tu léxico técnico va adelante de todo lo demás",
    },
  ],
  unmeasured:
    "De tu inglés todavía no medimos ~85%. No es un problema: es el mapa diciendo la verdad — y se achica solo con el uso.",
  startingPoint:
    "Empezamos por los pasados al narrar — con tu léxico técnico, que ya lo tenés — y medimos el resto sin que lo notes.",
};

export function createMockCore(): CorePort {
  return {
    async getOnboardingState(userId: string): Promise<OnboardingState> {
      return { userId, step: null };
    },

    async submitOnboardingAnswer(userId: string): Promise<OnboardingState> {
      return { userId, step: null };
    },

    async getVerdict(): Promise<Verdict> {
      return VERDICT;
    },
  };
}
