import { notFound } from "next/navigation";

/**
 * Claims every path under the locale that no real route does, so an unknown
 * URL renders the localized 404 inside the public shell — header, footer and
 * locale intact — instead of the framework's bare default outside it.
 */
export default function CatchAllPage() {
  notFound();
}
