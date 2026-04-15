import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

const PRIMARY_ADAPTER_IMPORT_PATTERNS = [
  "**/api",
  "**/api/**",
  "**/cli",
  "**/cli/**",
  "**/hooks",
  "**/hooks/**",
  "**/mcp",
  "**/mcp/**",
];

const NON_API_PRIMARY_ADAPTER_IMPORT_PATTERNS = [
  "**/cli",
  "**/cli/**",
  "**/hooks",
  "**/hooks/**",
  "**/mcp",
  "**/mcp/**",
];

const SECONDARY_ADAPTER_IMPORT_PATTERNS = [
  "**/adapters",
  "**/adapters/**",
  "**/warp",
  "**/warp/**",
];

const APPLICATION_IMPORT_PATTERNS = [
  "**/git",
  "**/git/**",
  "**/metrics",
  "**/metrics/**",
  "**/operations",
  "**/operations/**",
  "**/policy",
  "**/policy/**",
  "**/release",
  "**/release/**",
  "**/session",
  "**/session/**",
];

const HOST_LIBRARY_IMPORT_PATTERNS = ["node:*", "@git-stunts/*"];

/**
 * @param {string[]} files
 * @param {string} layer
 * @param {{ message: string, patterns: string[] }[]} groups
 */
function withHexBoundaryRestrictions(files, layer, groups) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: groups.map(({ message, patterns }) => ({
            group: patterns,
            message: `${layer} ${message}`,
          })),
        },
      ],
    },
  };
}

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
  withHexBoundaryRestrictions(
    [
      "src/contracts/**/*.ts",
      "src/guards/**/*.ts",
      "src/format/**/*.ts",
      "src/metrics/types.ts",
      "src/release/security-gate.ts",
    ],
    "Foundational contracts and pure helpers must not",
    [
      {
        patterns: PRIMARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on primary adapters (api, cli, mcp, or hooks).",
      },
      {
        patterns: SECONDARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on secondary adapters (adapters, parser, or warp).",
      },
      {
        patterns: APPLICATION_IMPORT_PATTERNS,
        message: "depend on application modules.",
      },
      {
        patterns: HOST_LIBRARY_IMPORT_PATTERNS,
        message: "import host libraries directly.",
      },
      {
        patterns: ["**/ports", "**/ports/**"],
        message: "depend on ports.",
      },
    ],
  ),
  withHexBoundaryRestrictions(
    ["src/ports/**/*.ts"],
    "Ports must not",
    [
      {
        patterns: PRIMARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on primary adapters (api, cli, mcp, or hooks).",
      },
      {
        patterns: SECONDARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on secondary adapters (adapters, parser, or warp).",
      },
      {
        patterns: APPLICATION_IMPORT_PATTERNS,
        message: "depend on application modules.",
      },
      {
        patterns: HOST_LIBRARY_IMPORT_PATTERNS,
        message: "import host libraries directly.",
      },
    ],
  ),
  withHexBoundaryRestrictions(
    [
      "src/operations/**/*.ts",
      "src/policy/**/*.ts",
      "src/session/**/*.ts",
      "src/git/diff.ts",
    ],
    "Application modules must not",
    [
      {
        patterns: PRIMARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on primary adapters (api, cli, mcp, or hooks).",
      },
      {
        patterns: SECONDARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on secondary adapters (adapters, parser, or warp).",
      },
      {
        patterns: HOST_LIBRARY_IMPORT_PATTERNS,
        message: "import host libraries directly.",
      },
    ],
  ),
  withHexBoundaryRestrictions(
    [
      "src/adapters/**/*.ts",
      "src/parser/**/*.ts",
      "src/warp/**/*.ts",
      "src/git/target-git-hook-bootstrap.ts",
      "src/metrics/logger.ts",
    ],
    "Secondary adapters must not",
    [
      {
        patterns: PRIMARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on primary adapters (api, cli, mcp, or hooks).",
      },
    ],
  ),
  withHexBoundaryRestrictions(
    ["src/index.ts"],
    "Package export root must not",
    [
      {
        patterns: NON_API_PRIMARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on non-API primary adapters directly.",
      },
      {
        patterns: APPLICATION_IMPORT_PATTERNS,
        message: "own application logic directly.",
      },
      {
        patterns: SECONDARY_ADAPTER_IMPORT_PATTERNS,
        message: "depend on secondary adapters directly.",
      },
      {
        patterns: ["**/ports", "**/ports/**"],
        message: "depend on ports directly.",
      },
      {
        patterns: HOST_LIBRARY_IMPORT_PATTERNS,
        message: "import host libraries directly.",
      },
    ],
  ),
  {
    files: ["eslint.config.js"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["test/**/*.test.ts", "tests/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  {
    ignores: [
      "bin/",
      "dist/",
      "coverage/",
      "node_modules/",
      ".graft/",
      ".claude/",
      ".obsidian/",
      "test/fixtures/",
      "docs/study/infra/",
    ],
  },
);
