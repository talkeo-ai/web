# web

Talkeo web frontend. The browser-based interface to the Talkeo Cloud.

## Status

**Empty until Phase E** (post-sprint, after 17 July). This repo will contain:

- Next.js application
- Dashboard for managing learning progress, can-dos, sessions
- Audio playback of past Leo sessions
- Settings, profile, account
- Consumes the same `talkeo-ai/talkeo` backend as the native apps

## Why a separate repo

Different language and toolchain than the backend (TypeScript vs Python), different deploy target (Vercel/static vs container), different release cadence. Lives as its own repo per the architecture's repo-separation policy.

The web frontend consumes the backend's OpenAPI spec at `/openapi.json` to generate its API client — no source-code coupling needed.

See the org-wide [ROADMAP](https://github.com/talkeo-ai/.github/blob/main/profile/ROADMAP.md) and the backend [architecture document](https://github.com/talkeo-ai/talkeo/blob/main/docs/architecture.md) for context.

## License

MIT.
