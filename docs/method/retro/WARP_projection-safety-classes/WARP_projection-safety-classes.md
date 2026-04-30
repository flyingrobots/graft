# Retro: WARP_projection-safety-classes

## What shipped

`getQuestionClass(toolName)` classifies tools by information need.
`checkProjectionSafety(tool, projection)` warns when insufficient.
`getSafetyClassMetadata(projection)` returns answerable classes.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Declared question classes per projection | ✅ ANSWERABLE map |
| Warning when question exceeds safety class | ✅ checkProjectionSafety |
| Structural insufficiency floor per query | ❌ Fixed mapping, no per-file computation |
| Metadata available programmatically | ✅ getSafetyClassMetadata |

## Gaps

1. **No per-file insufficiency floor**: Uses a fixed question-class →
   projection mapping. Card mentions computing the floor per file based
   on compression ratio and symbol density.

## Drift check

- Pure functions, no imports, no architecture concerns ✅
