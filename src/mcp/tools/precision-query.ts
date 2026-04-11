import picomatch from "picomatch";
import { PrecisionSymbolMatch } from "./precision-match.js";

type SymbolQueryMode = "glob" | "plain";

export class RankedPrecisionSymbolMatch {
  readonly match: PrecisionSymbolMatch;
  readonly score: number;

  constructor(opts: {
    match: PrecisionSymbolMatch;
    score: number;
  }) {
    if (opts.score < 0) {
      throw new Error("RankedPrecisionSymbolMatch: score must be >= 0");
    }
    this.match = opts.match;
    this.score = opts.score;
    Object.freeze(this);
  }
}

class PrecisionSymbolQuery {
  readonly text: string;
  readonly mode: SymbolQueryMode;
  readonly #globMatcher?: (name: string) => boolean;

  constructor(query: string) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 0) {
      throw new Error("PrecisionSymbolQuery: query must be non-empty");
    }
    this.text = normalizedQuery;
    if (picomatch.scan(normalizedQuery).isGlob) {
      this.mode = "glob";
      this.#globMatcher = picomatch(normalizedQuery, { nocase: true });
    } else {
      this.mode = "plain";
    }
    Object.freeze(this);
  }

  score(name: string): number | null {
    if (this.mode === "glob") {
      return this.#globMatcher?.(name) === true ? 0 : null;
    }

    const loweredName = name.toLowerCase();
    const loweredQuery = this.text.toLowerCase();
    if (name === this.text) return 0;
    if (loweredName === loweredQuery) return 1;
    if (name.startsWith(this.text)) return 2;
    if (loweredName.startsWith(loweredQuery)) return 3;
    return loweredName.includes(loweredQuery) ? 4 : null;
  }
}

export class PrecisionSearchRequest {
  readonly exactName?: string;
  readonly query?: PrecisionSymbolQuery;
  readonly kind?: string;
  readonly filePath?: string;
  readonly pathPrefix?: string;
  readonly ceiling?: number;

  constructor(opts: {
    exactName?: string;
    query?: string;
    kind?: string;
    filePath?: string;
    pathPrefix?: string;
    ceiling?: number;
  }) {
    const exactName = opts.exactName?.trim();
    const query = opts.query?.trim();
    const kind = opts.kind?.trim().toLowerCase();
    const filePath = opts.filePath?.trim();
    const pathPrefix = opts.pathPrefix?.trim();

    if ((exactName?.length ?? 0) === 0 && (query?.length ?? 0) === 0) {
      throw new Error("PrecisionSearchRequest: exactName or query is required");
    }
    if (
      opts.ceiling !== undefined &&
      (!Number.isInteger(opts.ceiling) || opts.ceiling < 1)
    ) {
      throw new Error("PrecisionSearchRequest: ceiling must be an integer >= 1");
    }

    if (exactName !== undefined && exactName.length > 0) this.exactName = exactName;
    if (query !== undefined && query.length > 0) this.query = new PrecisionSymbolQuery(query);
    if (kind !== undefined && kind.length > 0) this.kind = kind;
    if (filePath !== undefined && filePath.length > 0) this.filePath = filePath;
    if (pathPrefix !== undefined && pathPrefix.length > 0) this.pathPrefix = pathPrefix;
    if (opts.ceiling !== undefined) this.ceiling = opts.ceiling;
    Object.freeze(this);
  }

  selectLens(): "file" | "exact" | "all" {
    if (this.filePath !== undefined) return "file";
    if (this.exactName !== undefined) return "exact";
    return "all";
  }

  rank(match: PrecisionSymbolMatch): RankedPrecisionSymbolMatch | null {
    if (this.exactName !== undefined && match.name !== this.exactName) return null;
    if (this.kind !== undefined && match.kind.toLowerCase() !== this.kind) return null;
    if (this.filePath !== undefined && match.path !== this.filePath) return null;
    if (this.pathPrefix !== undefined && !match.path.startsWith(this.pathPrefix)) return null;
    if (this.query === undefined) {
      return new RankedPrecisionSymbolMatch({ match, score: 0 });
    }
    const score = this.query.score(match.name);
    return score === null ? null : new RankedPrecisionSymbolMatch({ match, score });
  }

  sort(matches: readonly RankedPrecisionSymbolMatch[]): PrecisionSymbolMatch[] {
    return [...matches]
      .sort((a, b) =>
        a.score - b.score ||
        (this.query?.mode === "plain" ? a.match.name.length - b.match.name.length : 0) ||
        a.match.path.localeCompare(b.match.path) ||
        a.match.name.localeCompare(b.match.name)
      )
      .map((entry) => entry.match);
  }
}
