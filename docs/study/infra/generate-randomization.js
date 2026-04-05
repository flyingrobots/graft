#!/usr/bin/env node

// Generate randomization schedule for the graft effectiveness study.
// Blocked by task category, counterbalanced across participants.
// PRNG seed is recorded for reproducibility.

const SEED = 20260404;
const GENERATED_AT = process.env.GRAFT_RANDOMIZATION_GENERATED_AT ?? "2026-04-04T00:00:00.000Z";
const rawParticipants = process.env.GRAFT_PARTICIPANTS ?? process.argv[2] ?? "1";
const PARTICIPANTS = Number.parseInt(rawParticipants, 10);
if (!Number.isInteger(PARTICIPANTS) || PARTICIPANTS <= 0) {
  throw new Error(`PARTICIPANTS must be a positive integer, got: ${rawParticipants}`);
}

const pairs = [
  { id: "P01", tasks: ["T01", "T02"], category: "feature" },
  { id: "P02", tasks: ["T03", "T04"], category: "bugfix" },
  { id: "P03", tasks: ["T05", "T06"], category: "feature" },
  { id: "P04", tasks: ["T07", "T08"], category: "investigation" },
  { id: "P05", tasks: ["T09", "T10"], category: "refactor" },
];

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);

function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const schedule = {
  seed: SEED,
  generated: GENERATED_AT,
  participants: [],
};

// Group pairs by category for blocked randomization.
// Within each category, half the pairs assign governed to task[0], half to task[1].
// This ensures balanced condition assignment per stratum.
const pairsByCategory = pairs.reduce((acc, pair) => {
  (acc[pair.category] ??= []).push(pair);
  return acc;
}, {});

for (let p = 0; p < PARTICIPANTS; p++) {
  const participantId = `participant_${String(p + 1).padStart(2, "0")}`;

  // Build category-balanced assignments
  const allAssignments = [];
  for (const [, categoryPairs] of Object.entries(pairsByCategory)) {
    const shuffled = shuffle(categoryPairs);
    shuffled.forEach((pair, i) => {
      // Alternate governed assignment within each category block
      const governFirst = i % 2 === 0;
      allAssignments.push({
        pair: pair.id,
        category: pair.category,
        governed: governFirst ? pair.tasks[0] : pair.tasks[1],
        ungoverned: governFirst ? pair.tasks[1] : pair.tasks[0],
      });
    });
  }

  // Shuffle final presentation order across all categories
  const orderedAssignments = shuffle(allAssignments);

  schedule.participants.push({
    id: participantId,
    assignments: orderedAssignments,
  });
}

// Sort keys for canonical output
const json = JSON.stringify(schedule, null, 2);
process.stdout.write(json + "\n");
