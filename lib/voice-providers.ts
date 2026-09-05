/**
 * The voice providers the consent line names, from configuration.
 *
 * The names are deployment facts, not copy: they change with the deployment
 * and never live in `messages/`. `NEXT_PUBLIC_VOICE_PROVIDERS` is a
 * comma-separated list; empty or unset means there is nothing to name, and
 * the line is not shown.
 */
export function voiceProviders(): string[] {
  return (process.env.NEXT_PUBLIC_VOICE_PROVIDERS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}
