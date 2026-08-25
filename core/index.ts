import "server-only";

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
 */
let instance: CorePort | undefined;

export function core(): CorePort {
  if (!instance) {
    const baseUrl = process.env.CORE_URL;
    instance = baseUrl ? createHttpCore(baseUrl) : createMockCore();
  }
  return instance;
}
