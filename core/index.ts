import "server-only";

import { readSessionToken } from "@/lib/session/core-session";

import { createHttpCore } from "./http";
import { createMockCore } from "./mock";
import type { CorePort } from "./port";

export * from "./contracts";
export type { CorePort } from "./port";

/**
 * Configuration picks the adapter.
 *
 * Set `CORE_URL` to talk to the real service; leave it unset and the fixture
 * answers. There is no third branch and no flag scattered anywhere else.
 *
 * Either way the caller is this browser's session, read from its cookie on
 * every call, so one instance serves every request. `CORE_SERVICE_KEY` is this
 * server's secret with the service; this module is server-only, so it never
 * reaches a bundle.
 */
let instance: CorePort | undefined;

export function core(): CorePort {
  if (!instance) {
    const baseUrl = process.env.CORE_URL;
    instance = baseUrl
      ? createHttpCore(baseUrl, {
          serviceKey: process.env.CORE_SERVICE_KEY,
          sessionToken: readSessionToken,
        })
      : createMockCore(readSessionToken);
  }
  return instance;
}
