# Analysis Stub

Placeholder for the analysis notebook. Will be implemented as a
script (Node.js or Python) that:

1. Loads per-attempt data from `docs/study/results/attempts/`
2. Computes M1 (retrieval burden) per attempt
3. Aggregates to participant-level paired means
4. Runs Wilcoxon signed-rank on paired differences (primary)
5. Computes bootstrap CI for paired completion rate difference
   (guardrail)
6. Runs Wilcoxon on M3 churn differences (secondary)
7. Computes descriptive stats for M4 and M5 (operational)
8. Produces summary tables and the efficiency frontier plot

## Data schema

Each attempt produces a JSON file:

```json
{
  "attempt_id": "participant_01_T01_governed",
  "participant": "participant_01",
  "task_id": "T01",
  "pair": "P01",
  "condition": "governed",
  "category": "feature",
  "completion": true,
  "retrieval_bytes": 45230,
  "discovery_bytes": 8120,
  "total_burden_bytes": 53350,
  "reread_count": 3,
  "reread_files": {"src/policy/types.ts": 2, "src/policy/evaluate.ts": 1},
  "tool_calls": 47,
  "tool_calls_by_class": {
    "retrieval": 12,
    "discovery": 8,
    "mutation": 15,
    "execution": 10,
    "state": 2
  },
  "evasion_events": 0,
  "duration_seconds": 1230,
  "acceptance_pass": true,
  "acceptance_details": [...],
  "recovery_events": null,
  "wall_clock_start": "2026-04-10T10:00:00Z",
  "wall_clock_end": "2026-04-10T10:20:30Z"
}
```

## Implementation

Deferred to after the shadow dry run — need real transcript data
to validate the parser and metric computation pipeline. The schema
above is the contract; the implementation will be built to match.
