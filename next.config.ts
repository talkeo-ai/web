import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Every route ships a prerendered shell; anything request-dependent goes
  // behind a <Suspense> boundary or a "use cache" function. `next build`
  // prints the result per route: an unexpected `ƒ` means a lost shell.
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

export default withNextIntl(nextConfig);
