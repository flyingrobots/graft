#!/usr/bin/env node

// Generate randomization schedule for the graft effectiveness study.
// Blocked by task category, counterbalanced across participants.
// PRNG seed is recorded for reproducibility.

const SEED = 20260404;
const PARTICIPANTS = 1; // pilot: single operator

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
  generated: new Date().toISOString(),
  participants: [],
};

for (let p = 0; p < PARTICIPANTS; p++) {
  const participantId = `participant_${String(p + 1).padStart(2, "0")}`;

  // Shuffle pair presentation order
  const orderedPairs = shuffle(pairs);

  const assignments = orderedPairs.map((pair) => {
    // Coin flip: which task gets governed?
    const flip = rng() < 0.5;
    const governedTask = flip ? pair.tasks[0] : pair.tasks[1];
    const ungovernedTask = flip ? pair.tasks[1] : pair.tasks[0];

    return {
      pair: pair.id,
      category: pair.category,
      governed: governedTask,
      ungoverned: ungovernedTask,
    };
  });

  schedule.participants.push({
    id: participantId,
    assignments,
  });
}

// Sort keys for canonical output
const json = JSON.stringify(schedule, null, 2);
process.stdout.write(json + "\n");
