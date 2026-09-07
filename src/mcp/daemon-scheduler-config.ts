import * as os from "node:os";

/**
 * How many daemon jobs may run at once — a fact about the machine.
 *
 * The scheduler has always accepted `maxConcurrentJobs`; nothing ever supplied
 * one, so both construction sites took a hardcoded default of 2 and there was
 * no way to change it short of editing an installed package. Two is right for
 * one session against one repo and wrong as soon as several share a daemon: a
 * fan-out of agents then queues behind itself and every session waits on the
 * slowest, including the one that started the fan-out. Measured on a ten-core
 * machine with five sessions bound: `longestQueuedWaitMs` at 20s, and an
 * interactive `code_find` taking 154s behind four sibling sessions.
 *
 * **Derived, not configured.** Concurrency is a property of the hardware the
 * daemon happens to be running on, so the daemon reads it off the hardware
 * rather than asking an operator to know it. There is deliberately no
 * environment variable and no stored setting: a number in a shell profile
 * outlives the machine it was measured for, and a number in repository
 * configuration travels to machines it was never measured for at all.
 *
 * `daemon-worker-child-pool.ts` already sizes its process pool this way
 * (`Math.max(1, Math.min(4, parallelism - 1))`), so this follows a shape the
 * daemon already uses rather than inventing a second convention.
 */

export interface DaemonSchedulerConfig {
  readonly maxConcurrentJobs: number;
}

export interface ResolveDaemonSchedulerConfigOptions {
  /**
   * How much parallelism the machine reports. A seam for tests, not a knob:
   * production always reads `os.availableParallelism()`, which respects
   * container CPU limits where `os.cpus().length` does not.
   */
  readonly availableParallelism?: () => number;
  readonly overrides?: Partial<DaemonSchedulerConfig>;
}

/** What a machine that reports no useful parallelism falls back to. */
export const MINIMUM_MAX_CONCURRENT_JOBS = 2;

/**
 * One lane fewer than the machine reports, floored at the old default.
 *
 * Minus one leaves a lane for whatever the operator is actually doing — the
 * daemon is background work on a machine someone is using. The floor means no
 * machine is ever worse off than before this was derived: a one- or two-core
 * box still gets 2, exactly what it had when the number was hardcoded.
 *
 * There is no upper cap, unlike the worker pool's four. A worker there is a
 * child process and costs memory; a job here is a promise waiting on one, so
 * the ceiling that matters is the pool's, and capping twice would only hide
 * which limit is binding when someone reads `daemon_status`.
 */
export function deriveMaxConcurrentJobs(parallelism: number): number {
  if (!Number.isFinite(parallelism) || parallelism <= 0) {
    return MINIMUM_MAX_CONCURRENT_JOBS;
  }
  return Math.max(MINIMUM_MAX_CONCURRENT_JOBS, Math.trunc(parallelism) - 1);
}

export function resolveDaemonSchedulerConfig(
  options: ResolveDaemonSchedulerConfigOptions = {},
): DaemonSchedulerConfig {
  const parallelism = options.availableParallelism ?? (() => os.availableParallelism());
  const base: DaemonSchedulerConfig = {
    maxConcurrentJobs: deriveMaxConcurrentJobs(parallelism()),
  };
  return {
    ...base,
    ...options.overrides,
  };
}
