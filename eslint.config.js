import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js", "vitest.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["eslint.config.js"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      ".graft/",
      ".claude/",
    ],
  },
);
