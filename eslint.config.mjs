import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
    ],
  },
  {
    // Deny-by-default enforcement is only meaningful if nothing can reach the
    // database except the data-access layer, so the Prisma client is off-limits
    // to pages, components and API routes.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db.ts", "src/lib/audit.ts", "src/lib/data/**", "src/lib/session.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "Import a function from @/lib/data/* instead: every query must go through the policy layer.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
