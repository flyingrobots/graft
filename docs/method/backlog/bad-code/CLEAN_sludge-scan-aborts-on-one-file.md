---
title: "One file's analysis failure aborts the whole sludge scan"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-10-02
---

# One file's analysis failure aborts the whole sludge scan

## Problem

`detectSludge` (`src/operations/sludge-detector.ts`) calls
`analyzeSludgeFile` for every tracked supported file with no per-file error
boundary. Any exception in one file's analysis propagates out of the scan, so
the caller gets a raw error instead of a report for the other files.

`CLEAN_sludge-untyped-parameter-crash` removed the one known trigger: an
untyped JavaScript parameter reaching `.text` on `undefined`. The structure
that turned one file's defect into a repository-wide failure is unchanged.

## Risk

The next parser or grammar edge case reproduces the same failure: a whole
scan lost to one file, with an error message that names neither the file nor
the check.

## Desired Outcome

A file whose analysis throws is reported as not analyzed, with its path and a
reason, and the scan still reports every other file.

## Acceptance Criteria

- A scan over a set where one file's analysis throws returns a report that
  covers every other file.
- The report names the file that was not analyzed and why.
- The sludge report schema declares the new field.
