import { Tripwire } from "./types.js";
import type { SessionDepth } from "./types.js";

const EDIT_BASH_TOOLS = new Set(["Edit", "Bash"]);
const LATE_READ_BYTE_THRESHOLD = 20480;
const LATE_READ_MESSAGE_THRESHOLD = 300;

export interface SessionTrackerSnapshot {
  readonly totalMessages: number;
  readonly toolCallsSinceUser: number;
  readonly editBashTransitions: number;
  readonly lastEditBashTool: string | null;
  readonly budgetBytes: number | null;
  readonly consumedBytes: number;
}

export class SessionTracker {
  private totalMessages = 0;
  private toolCallsSinceUser = 0;
  private editBashTransitions = 0;
  private lastEditBashTool: string | null = null;
  private budgetBytes: number | null = null;
  private consumedBytes = 0;

  static fromSnapshot(snapshot: SessionTrackerSnapshot): SessionTracker {
    const tracker = new SessionTracker();
    tracker.totalMessages = snapshot.totalMessages;
    tracker.toolCallsSinceUser = snapshot.toolCallsSinceUser;
    tracker.editBashTransitions = snapshot.editBashTransitions;
    tracker.lastEditBashTool = snapshot.lastEditBashTool;
    tracker.budgetBytes = snapshot.budgetBytes;
    tracker.consumedBytes = snapshot.consumedBytes;
    return tracker;
  }

  getMessageCount(): number {
    return this.totalMessages;
  }

  recordMessage(): void {
    this.totalMessages++;
  }

  recordToolCall(toolName: string): void {
    this.toolCallsSinceUser++;

    if (EDIT_BASH_TOOLS.has(toolName)) {
      // Count full Edit→Bash cycles, not individual alternations.
      // Each Edit followed by Bash is one cycle.
      if (this.lastEditBashTool === "Edit" && toolName === "Bash") {
        this.editBashTransitions++;
      }
      this.lastEditBashTool = toolName;
    }
  }

  recordUserMessage(): void {
    this.toolCallsSinceUser = 0;
  }

  checkTripwires(): Tripwire[] {
    const wires: Tripwire[] = [];

    if (this.totalMessages > 500) {
      wires.push(new Tripwire({
        signal: "SESSION_LONG",
        recommendation:
          "Session exceeds 500 messages. Use state_save to persist context and start a new session.",
      }));
    }

    if (this.editBashTransitions > 30) {
      wires.push(new Tripwire({
        signal: "EDIT_BASH_LOOP",
        recommendation:
          "Detected repeated edit/bash cycling. Step back and rethink the approach.",
      }));
    }

    if (this.toolCallsSinceUser > 80) {
      wires.push(new Tripwire({
        signal: "RUNAWAY_TOOLS",
        recommendation:
          "Over 80 tool calls without user input. Pause and check in with the user.",
      }));
    }

    return wires;
  }

  checkLateRead(outputBytes: number): Tripwire | null {
    if (
      outputBytes > LATE_READ_BYTE_THRESHOLD &&
      this.totalMessages > LATE_READ_MESSAGE_THRESHOLD
    ) {
      return new Tripwire({
        signal: "LATE_LARGE_READ",
        recommendation:
          "Large read late in session. Use file_outline or read_range instead.",
      });
    }
    return null;
  }

  setBudget(bytes: number): void {
    if (bytes <= 0) throw new Error("Budget must be positive");
    this.budgetBytes = bytes;
  }

  recordBytesConsumed(bytes: number): void {
    this.consumedBytes += bytes;
  }

  getBudget(): { total: number; consumed: number; remaining: number; fraction: number } | null {
    if (this.budgetBytes === null) return null;
    const remaining = Math.max(0, this.budgetBytes - this.consumedBytes);
    return {
      total: this.budgetBytes,
      consumed: this.consumedBytes,
      remaining,
      fraction: Math.round((this.consumedBytes / this.budgetBytes) * 1000) / 1000,
    };
  }

  snapshot(): SessionTrackerSnapshot {
    return {
      totalMessages: this.totalMessages,
      toolCallsSinceUser: this.toolCallsSinceUser,
      editBashTransitions: this.editBashTransitions,
      lastEditBashTool: this.lastEditBashTool,
      budgetBytes: this.budgetBytes,
      consumedBytes: this.consumedBytes,
    };
  }

  getSessionDepth(): SessionDepth {
    if (this.totalMessages < 100) {
      return "early";
    }
    if (this.totalMessages <= 500) {
      return "mid";
    }
    return "late";
  }
}
