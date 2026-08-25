import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // These two files were brought over from the running site, which does not
    // run the React Compiler rules. They work as written; the patterns the
    // compiler objects to are timer-driven resets, ref mutation during render
    // and manual memoization it cannot verify.
    //
    // Listed one by one rather than by directory. A glob over the folder would
    // quietly exempt every file added to it later, which is the drift this
    // exemption is supposed to be the opposite of. It comes off as each file
    // is rewritten, and nothing new goes on the list.
    files: ["components/landing/nervous-activity.tsx", "components/ui/orb.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

export default eslintConfig;
