import { describe, it, expect } from "vitest";
import { SessionTracker } from "../../../src/session/tracker.js";
import type { Tripwire } from "../../../src/session/types.js";

describe("session: tripwire detection", () => {
  describe("SESSION_LONG", () => {
    it("does not fire below 500 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 499; i++) {
        tracker.recordMessage();
      }
      expect(tracker.checkTripwires()).toEqual([]);
    });

    it("fires at 501 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 501; i++) {
        tracker.recordMessage();
      }
      const wires = tracker.checkTripwires();
      expect(wires).toContainEqual(
        expect.objectContaining({ signal: "SESSION_LONG" }),
      );
    });

    it("recommends state_save + reset", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 501; i++) {
        tracker.recordMessage();
      }
      const wire = tracker.checkTripwires().find(
        (w: Tripwire) => w.signal === "SESSION_LONG",
      );
      expect(wire?.recommendation).toContain("state_save");
    });
  });

  describe("EDIT_BASH_LOOP", () => {
    it("does not fire below 30 edit-bash transitions", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 29; i++) {
        tracker.recordToolCall("Edit");
        tracker.recordToolCall("Bash");
      }
      expect(tracker.checkTripwires()).toEqual([]);
    });

    it("fires after 31 edit-bash transitions", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 31; i++) {
        tracker.recordToolCall("Edit");
        tracker.recordToolCall("Bash");
      }
      const wires = tracker.checkTripwires();
      expect(wires).toContainEqual(
        expect.objectContaining({ signal: "EDIT_BASH_LOOP" }),
      );
    });

    it("only counts alternating edit-bash, not consecutive same-tool", () => {
      const tracker = new SessionTracker();
      // 60 Edit calls in a row — no transitions
      for (let i = 0; i < 60; i++) {
        tracker.recordToolCall("Edit");
      }
      expect(tracker.checkTripwires()).toEqual([]);
    });
  });

  describe("RUNAWAY_TOOLS", () => {
    it("does not fire below 80 tool calls since last user message", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 79; i++) {
        tracker.recordToolCall("Read");
      }
      expect(tracker.checkTripwires()).toEqual([]);
    });

    it("fires after 81 tool calls since last user message", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 81; i++) {
        tracker.recordToolCall("Read");
      }
      const wires = tracker.checkTripwires();
      expect(wires).toContainEqual(
        expect.objectContaining({ signal: "RUNAWAY_TOOLS" }),
      );
    });

    it("resets counter on user message", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 50; i++) {
        tracker.recordToolCall("Read");
      }
      tracker.recordUserMessage();
      for (let i = 0; i < 50; i++) {
        tracker.recordToolCall("Read");
      }
      // 50 since last user message — should not fire
      expect(tracker.checkTripwires()).toEqual([]);
    });
  });

  describe("LATE_LARGE_READ", () => {
    it("does not fire for large output before 300 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 200; i++) {
        tracker.recordMessage();
      }
      const wire = tracker.checkLateRead(25000);
      expect(wire).toBeNull();
    });

    it("fires for output > 20 KB after 300 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 301; i++) {
        tracker.recordMessage();
      }
      const wire = tracker.checkLateRead(25000);
      expect(wire).toBeDefined();
      expect(wire!.signal).toBe("LATE_LARGE_READ");
    });

    it("does not fire for output <= 20 KB after 300 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 301; i++) {
        tracker.recordMessage();
      }
      const wire = tracker.checkLateRead(20000);
      expect(wire).toBeNull();
    });
  });

  describe("session depth", () => {
    it("reports 'early' for < 100 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 50; i++) {
        tracker.recordMessage();
      }
      expect(tracker.getSessionDepth()).toBe("early");
    });

    it("reports 'mid' for 100-500 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 250; i++) {
        tracker.recordMessage();
      }
      expect(tracker.getSessionDepth()).toBe("mid");
    });

    it("reports 'late' for > 500 messages", () => {
      const tracker = new SessionTracker();
      for (let i = 0; i < 501; i++) {
        tracker.recordMessage();
      }
      expect(tracker.getSessionDepth()).toBe("late");
    });
  });
});
