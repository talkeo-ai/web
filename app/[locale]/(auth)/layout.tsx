/**
 * The screens about the account itself: signing in and the link from the mail.
 *
 * No site header and no footer. These screens are one task each, and a bar of
 * links around them is a set of ways out of it (Joaquin, 28/oct: "me gusta que
 * no tenga header y footer"). The way back is the brand, which every page here
 * carries in its corner.
 */
export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
