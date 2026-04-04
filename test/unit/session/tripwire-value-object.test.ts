import { describe, it, expect } from "vitest";
import { Tripwire } from "../../../src/session/types.js";

describe("value objects: Tripwire", () => {
  it("constructs with signal and recommendation", () => {
    const tw = new Tripwire({
      signal: "SESSION_LONG",
      recommendation: "Save state and start fresh.",
    });
    expect(tw.signal).toBe("SESSION_LONG");
    expect(tw.recommendation).toBe("Save state and start fresh.");
  });

  it("is frozen after construction", () => {
    const tw = new Tripwire({
      signal: "SESSION_LONG",
      recommendation: "Save state and start fresh.",
    });
    expect(Object.isFrozen(tw)).toBe(true);
  });

  it("throws on empty signal", () => {
    expect(
      () => new Tripwire({ signal: "", recommendation: "Do something." }),
    ).toThrow();
  });

  it("throws on empty recommendation", () => {
    expect(
      () => new Tripwire({ signal: "SESSION_LONG", recommendation: "" }),
    ).toThrow();
  });

  it("is an instanceof Tripwire", () => {
    const tw = new Tripwire({
      signal: "SESSION_LONG",
      recommendation: "Save state and start fresh.",
    });
    expect(tw).toBeInstanceOf(Tripwire);
  });
});
