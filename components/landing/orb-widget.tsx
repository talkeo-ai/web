"use client";

import { Orb } from "@/components/ui/orb";

export function OrbWidget() {
  return (
    <Orb
      colors={["#70b8e8", "#50d0e0", "#3898c8"]}
      seed={42}
      agentState="thinking"
    />
  );
}
