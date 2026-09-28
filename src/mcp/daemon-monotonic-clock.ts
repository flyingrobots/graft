export type MonotonicClockFailureReason = "NON_FINITE" | "NEGATIVE" | "REGRESSION";

export interface MonotonicClockFailure {
  readonly code: "MONOTONIC_CLOCK_INVALID";
  readonly reason: MonotonicClockFailureReason;
  readonly received: string;
  readonly previousAcceptedMs: number | null;
}

export type MonotonicClockSample =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly failure: MonotonicClockFailure };

export class MonotonicClockSampleError extends Error {
  readonly code = "MONOTONIC_CLOCK_INVALID";
  readonly failure: MonotonicClockFailure;

  constructor(failure: MonotonicClockFailure) {
    super(`Invalid monotonic clock sample: ${failure.reason}`);
    this.name = "MonotonicClockSampleError";
    this.failure = failure;
  }
}

export class MonotonicClock {
  private previousAcceptedMs: number | null = null;

  constructor(private readonly readSource: () => number) {}

  sample(): MonotonicClockSample {
    const received = this.readSource();
    const reason = !Number.isFinite(received)
      ? "NON_FINITE"
      : received < 0
        ? "NEGATIVE"
        : this.previousAcceptedMs !== null && received < this.previousAcceptedMs
          ? "REGRESSION"
          : null;
    if (reason !== null) {
      return {
        ok: false,
        failure: {
          code: "MONOTONIC_CLOCK_INVALID",
          reason,
          received: String(received),
          previousAcceptedMs: this.previousAcceptedMs,
        },
      };
    }
    this.previousAcceptedMs = received;
    return { ok: true, value: received };
  }

  read(): number {
    const sample = this.sample();
    if (!sample.ok) throw new MonotonicClockSampleError(sample.failure);
    return sample.value;
  }
}
