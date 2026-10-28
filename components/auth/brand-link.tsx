import { Link } from "@/lib/i18n/navigation";

/** The way home from a screen with no header: the same mark the header carries. */
export function BrandLink({ label }: { label: string }) {
  return (
    <Link
      href="/"
      prefetch={false}
      aria-label={label}
      className="text-foreground font-heading focus-key:ring-ring inline-flex items-center gap-2 rounded-lg text-lg font-semibold outline-none focus-key:ring-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" className="size-7 rounded-full" />
      Talkeo
    </Link>
  );
}
