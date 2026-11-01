/**
 * A vocabulary level from swiped words: the yes/no test (Meara & Buxton 1987;
 * Meara's X_Lex) run the way the Core runs it, so what the landing shows is
 * the shape of the real measurement and not a toy. The rules are copied from
 * the Core's selector (`repos/core/src/core/domain/selector.py`, 1/nov):
 *
 * - 30 items in the vocabulary area, starting at A2 (`START_BAND`,
 *   `application/measure.py`);
 * - a running band that steps up after 2 consecutive "yes" and down after 2
 *   consecutive "no";
 * - one invented-but-plausible word after every 5 real ones, whose "yes" is a
 *   false alarm that corrects the result, so a yes-sayer cannot inflate it.
 *
 * The estimate is simpler than the Core's (no per-cell posterior, no
 * refinement pass); it is a front-end stand-in until the deck is served by the
 * Core. Nothing here calls it.
 */

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Band = (typeof BANDS)[number];

export type Pos = "noun" | "verb" | "adjective" | "adverb" | "preposition";

export type Word = {
  word: string;
  /** The band a real word belongs to; absent on an invented one. */
  band?: Band;
  pos: Pos;
  /** How it sounds, in IPA. An invented word gets a plausible one. */
  ipa: string;
};

/** The Core's knobs for the vocabulary area, mirrored. */
export const KNOBS = {
  total: 30,
  pseudoEvery: 5,
  upAfter: 2,
  downAfter: 2,
  start: "A2" as Band,
};

/** One answered card: what was shown, as which band, and the answer. */
export type Answer = { word: Word; shown: Band; known: boolean };

/** What to show next. `shown` is the band on the card's tag. */
export type Next = { word: Word; shown: Band };

const R = (word: string, band: Band, pos: Pos, ipa: string): Word => ({ word, band, pos, ipa });
const P = (word: string, pos: Pos, ipa: string): Word => ({ word, pos, ipa });

/**
 * Eight real words per band, enough that the ladder can sit on one band for a
 * while without running dry, and few transparent cognates for a Spanish
 * reader below C1 — a cognate is recognised, not known, which is exactly the
 * error the Core caps them for.
 */
export const REAL: Word[] = [
  R("house", "A1", "noun", "/haʊs/"),
  R("water", "A1", "noun", "/ˈwɔːtər/"),
  R("friend", "A1", "noun", "/frɛnd/"),
  R("happy", "A1", "adjective", "/ˈhæpi/"),
  R("eat", "A1", "verb", "/iːt/"),
  R("morning", "A1", "noun", "/ˈmɔːrnɪŋ/"),
  R("cheap", "A1", "adjective", "/tʃiːp/"),
  R("buy", "A1", "verb", "/baɪ/"),

  R("borrow", "A2", "verb", "/ˈbɑːroʊ/"),
  R("journey", "A2", "noun", "/ˈdʒɜːrni/"),
  R("careful", "A2", "adjective", "/ˈkɛrfəl/"),
  R("neighbor", "A2", "noun", "/ˈneɪbər/"),
  R("angry", "A2", "adjective", "/ˈæŋɡri/"),
  R("luggage", "A2", "noun", "/ˈlʌɡɪdʒ/"),
  R("forget", "A2", "verb", "/fərˈɡɛt/"),
  R("quiet", "A2", "adjective", "/ˈkwaɪət/"),

  R("achieve", "B1", "verb", "/əˈtʃiːv/"),
  R("deserve", "B1", "verb", "/dɪˈzɜːrv/"),
  R("crowded", "B1", "adjective", "/ˈkraʊdɪd/"),
  R("ashamed", "B1", "adjective", "/əˈʃeɪmd/"),
  R("rely", "B1", "verb", "/rɪˈlaɪ/"),
  R("bother", "B1", "verb", "/ˈbɑːðər/"),
  R("apparently", "B1", "adverb", "/əˈpærəntli/"),
  R("wage", "B1", "noun", "/weɪdʒ/"),

  R("reluctant", "B2", "adjective", "/rɪˈlʌktənt/"),
  R("thorough", "B2", "adjective", "/ˈθɜːroʊ/"),
  R("cope", "B2", "verb", "/koʊp/"),
  R("outcome", "B2", "noun", "/ˈaʊtkʌm/"),
  R("keen", "B2", "adjective", "/kiːn/"),
  R("nevertheless", "B2", "adverb", "/ˌnɛvərðəˈlɛs/"),
  R("overwhelm", "B2", "verb", "/ˌoʊvərˈwɛlm/"),
  R("awkward", "B2", "adjective", "/ˈɔːkwərd/"),

  R("notwithstanding", "C1", "preposition", "/ˌnɑːtwɪθˈstændɪŋ/"),
  R("undermine", "C1", "verb", "/ˌʌndərˈmaɪn/"),
  R("scrutiny", "C1", "noun", "/ˈskruːtəni/"),
  R("hinder", "C1", "verb", "/ˈhɪndər/"),
  R("wary", "C1", "adjective", "/ˈwɛri/"),
  R("foster", "C1", "verb", "/ˈfɔːstər/"),
  R("setback", "C1", "noun", "/ˈsɛtbæk/"),
  R("compelling", "C1", "adjective", "/kəmˈpɛlɪŋ/"),

  R("obfuscate", "C2", "verb", "/ˈɑːbfəskeɪt/"),
  R("quandary", "C2", "noun", "/ˈkwɑːndəri/"),
  R("ostensibly", "C2", "adverb", "/ɑːˈstɛnsəbli/"),
  R("cajole", "C2", "verb", "/kəˈdʒoʊl/"),
  R("umbrage", "C2", "noun", "/ˈʌmbrɪdʒ/"),
  R("perfunctory", "C2", "adjective", "/pərˈfʌŋktəri/"),
  R("recalcitrant", "C2", "adjective", "/rɪˈkælsɪtrənt/"),
  R("ubiquitous", "C2", "adjective", "/juːˈbɪkwɪtəs/"),
];

/** Invented words that follow English spelling, so they cannot be told apart by look. */
export const PSEUDO: Word[] = [
  P("flurbish", "verb", "/ˈflɜːrbɪʃ/"),
  P("cradgy", "adjective", "/ˈkrædʒi/"),
  P("plimter", "noun", "/ˈplɪmtər/"),
  P("moxen", "verb", "/ˈmɑːksən/"),
  P("brastle", "adjective", "/ˈbræsəl/"),
  P("glumber", "noun", "/ˈɡlʌmbər/"),
];

const at = (band: Band) => BANDS.indexOf(band);

/** Where the ladder stands after these answers. Invented words never move it. */
export function runningBand(answers: Answer[]): Band {
  let index = at(KNOBS.start);
  let streak = 0; // > 0 a run of yes, < 0 a run of no
  for (const answer of answers) {
    if (!answer.word.band) continue;
    streak = answer.known ? Math.max(streak, 0) + 1 : Math.min(streak, 0) - 1;
    if (streak >= KNOBS.upAfter) {
      index = Math.min(BANDS.length - 1, index + 1);
      streak = 0;
    } else if (streak <= -KNOBS.downAfter) {
      index = Math.max(0, index - 1);
      streak = 0;
    }
  }
  return BANDS[index];
}

/**
 * The next card, or null when the deck is done. After every `pseudoEvery` real
 * words comes an invented one, wearing the running band so it does not stand
 * out. A real word comes from the running band; if that band has run dry, from
 * the nearest one that has not.
 */
export function nextCard(
  answers: Answer[],
  real: Word[] = REAL,
  pseudo: Word[] = PSEUDO,
): Next | null {
  if (answers.length >= KNOBS.total) return null;
  const band = runningBand(answers);
  const used = new Set(answers.map((a) => a.word.word));
  const realSoFar = answers.filter((a) => a.word.band).length;
  const lastWasPseudo = answers.length > 0 && !answers[answers.length - 1].word.band;

  if (realSoFar > 0 && realSoFar % KNOBS.pseudoEvery === 0 && !lastWasPseudo) {
    const word = pseudo.find((w) => !used.has(w.word));
    if (word) return { word, shown: band };
  }

  const byDistance = [...BANDS].sort(
    (a, b) => Math.abs(at(a) - at(band)) - Math.abs(at(b) - at(band)) || at(a) - at(b),
  );
  for (const candidate of byDistance) {
    const word = real.find((w) => w.band === candidate && !used.has(w.word));
    if (word) return { word, shown: candidate };
  }
  return null;
}

export type LevelResult = {
  band: Band;
  /** Real words said known, out of the real words shown. */
  known: number;
  real: number;
  /** Invented words said known. */
  fooled: string[];
};

/**
 * The floor: the highest band at which at least half the real words shown
 * were known, with every band below it that was shown also at half or more —
 * a band the ladder skipped counts as passed, since it climbed over it. Then
 * the false alarms take it down: one band for any, two when half or more of
 * the invented words were claimed.
 */
export function estimate(answers: Answer[]): LevelResult {
  const real = answers.filter((a) => a.word.band);
  const pseudo = answers.filter((a) => !a.word.band);
  const fooled = pseudo.filter((a) => a.known).map((a) => a.word.word);

  let floor = -1;
  for (let i = 0; i < BANDS.length; i++) {
    const shown = real.filter((a) => a.word.band === BANDS[i]);
    if (shown.length === 0) {
      // Skipped by the ladder: passed if it climbed past it, unknown otherwise.
      if (real.some((a) => at(a.word.band!) > i && a.known)) {
        floor = i;
        continue;
      }
      break;
    }
    const share = shown.filter((a) => a.known).length / shown.length;
    if (share >= 0.5) floor = i;
    else break;
  }

  const falseAlarms = pseudo.length ? fooled.length / pseudo.length : 0;
  const drop = falseAlarms >= 0.5 ? 2 : falseAlarms > 0 ? 1 : 0;
  const index = Math.max(0, floor - drop);

  return {
    band: BANDS[index],
    known: real.filter((a) => a.known).length,
    real: real.length,
    fooled,
  };
}

/** Plays a whole deck with a rule for each word. For tests and previews. */
export function play(knows: (word: Word) => boolean): Answer[] {
  const answers: Answer[] = [];
  for (let next = nextCard(answers); next; next = nextCard(answers)) {
    answers.push({ ...next, known: knows(next.word) });
  }
  return answers;
}
