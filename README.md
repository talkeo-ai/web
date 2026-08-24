# web

The Talkeo web app: the landing page and the product itself.

## Status

**Foundation only.** The project runs, builds and is tested, but there is no product in it yet —
the landing page and the onboarding are being built next. The two placeholder pages exist so the
build has something to verify.

## Requirements

- Node.js 22+
- npm

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build
npm run lint
npm run typecheck
npm test             # unit tests
npm run test:e2e     # end-to-end, against a production build
```

## How it works

Talkeo measures what a learner actually knows — per micro-skill, with uncertainty stated, from
real use of the language and never from exams — and builds today's practice from that. This
repository is the browser client of that system.

**Server Components by default.** A component becomes a Client Component only when it needs
state, events or the DOM, and it is kept as small as possible.

**Cache Components are enabled.** Every route ships a prerendered shell, and anything that
depends on the request is streamed in behind a `<Suspense>` boundary. `npm run build` prints the
result per route: `○` is fully static, `◐` is a partial prerender, and an unexpected `ƒ` means a
route lost its shell — that is a bug, not a detail.

**One data boundary.** Everything the app knows about the learner comes through `core/`, which
is an interface with two adapters behind it: a fixture today, HTTP against the real service when
it exists. Configuration picks one; no component knows the difference.

**No hardcoded copy.** Every user-facing string lives in `messages/`. Spanish is the only locale
loaded today.

## Layout

```
app/[locale]/(public)   pages that need no identity — prerendered whole
app/[locale]/(app)      pages that run with an identity, anonymous or registered
components/             ui/ holds the primitives; the rest is grouped by the route that uses it
core/                   the client of the measurement service: contract, port, adapters
lib/                    i18n and session helpers
messages/               all user-facing copy
proxy.ts                locale resolution and the anonymous session cookie
```

## Accounts

The whole onboarding runs without signing up. A visitor gets an id on their first request and
everything they produce is stored against it; leaving an email later attaches identity to that
same id, and nothing is migrated.

## License

MIT. See [LICENSE](./LICENSE).
