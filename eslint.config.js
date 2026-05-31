import js from "@eslint/js"
import checkFile from "eslint-plugin-check-file"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import prettier from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["**/dist/**"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      prettier,
    ],
    plugins: {
      "check-file": checkFile,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ["apps/web/src/components/**/*.{js,jsx}", "src/components/**/*.{js,jsx}"],
    ignores: ["apps/web/src/components/ui/**/*", "src/components/ui/**/*"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "**/*.{js,jsx}": "PASCAL_CASE",
        },
      ],
    },
  },
  {
    files: ["apps/web/src/components/ui/**/*.{js,jsx}", "src/components/ui/**/*.{js,jsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
])
