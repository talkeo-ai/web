import { Link } from "@/lib/i18n/navigation";

/**
 * Pick one of several, where picking is going somewhere.
 *
 * These are links, not controls: the answer lands in the next screen's URL, so
 * there is no client state to lose, the back button works, and the list works
 * with scripting off. It is the same shape the language switcher already uses.
 */
export function OptionCardList({
  options,
}: {
  options: { href: string; label: string }[];
}) {
  return (
    <ul data-slot="option-card-list" className="flex flex-col gap-3">
      {options.map((option) => (
        <li key={option.href}>
          <Link
            href={option.href}
            className="border-border bg-card-quiet hover:border-border-strong focus-visible:ring-ring focus-visible:ring-offset-background block rounded-2xl border-2 px-5 py-4 transition-colors duration-(--duration-control) ease-(--ease-standard) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {option.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
