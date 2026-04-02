# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Add missing `@types/node` and `@types/picomatch` dev dependencies
  (required by TypeScript 6 which no longer auto-includes `@types/*`).
- Add `"types": ["node"]` to `tsconfig.json` for TS 6 compatibility.
- Fix all ESLint errors across `src/`: namespace imports for node builtins,
  `Array<T>` style violations, unused variables, unused eslint-disable
  directives, and `restrict-template-expressions` violations.

### Added

- Repository scaffolding: directory structure, package.json, LICENSE,
  METHOD.md, community files.
- The Method: backlog, cycles, legends, retrospectives.
- Cycle 0001 design doc: The Governor.
