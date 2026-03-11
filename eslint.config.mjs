import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const tsConfig = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      project: true,
      tsconfigRootDir: import.meta.dirname
    }
  }
}));

export default defineConfig([
  globalIgnores([
    ".next/**",
    ".local/**",
    "coverage/**",
    "next-env.d.ts",
    "node_modules/**",
    "playwright-report/**",
    "prisma/migrations/**/migration.sql",
    "test-results/**"
  ]),
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"]
  }),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node
      },
      sourceType: "module"
    }
  },
  js.configs.recommended,
  ...tsConfig,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports"
        }
      ]
    }
  }
]);
