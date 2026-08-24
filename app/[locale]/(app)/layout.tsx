/**
 * Everything under here runs with an identity — anonymous or registered. The
 * two are the same tree: the only difference is whether an email is attached to
 * the id, which is a property of the user and not a zone of the app.
 *
 * The identity itself is guaranteed by `proxy.ts`, which mints the cookie
 * before the request reaches this layout. That is deliberate: if this layout
 * read the cookie, every route below would lose its prerendered shell. Read the
 * user inside a component behind a `<Suspense>` boundary instead.
 */
export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
