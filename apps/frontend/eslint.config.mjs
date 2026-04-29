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
  // Enforce feature public API: only `@/features/<name>` (the barrel) is
  // allowed from outside; deep imports into a feature's internals are banned.
  // Internal feature files use relative imports, so this rule never fires
  // within a feature's own directory.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*", "@/features/*/**"],
              message:
                "Import from a feature's public barrel only (@/features/<name>). Deep imports into a feature's internals are forbidden — add the export to that feature's index.ts if it should be public.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
