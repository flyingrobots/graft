import { describe, it, expect } from "vitest";
import { extractOutline } from "../../../src/parser/outline.js";
import fs from "node:fs";
import path from "node:path";

const AUDIT = path.resolve(import.meta.dirname, "../../fixtures/audit");

function loadAndParse(filename: string, lang: "ts" | "js" = "ts") {
  const source = fs.readFileSync(path.join(AUDIT, filename), "utf-8");
  return extractOutline(source, lang);
}

function byName(result: ReturnType<typeof extractOutline>, name: string) {
  return result.entries.find((e) => e.name === name);
}

// ---------------------------------------------------------------------------
// React component (arrow functions, hooks, JSX)
// ---------------------------------------------------------------------------
describe("audit: react-component", () => {
  // TSX parsed as TS — JSX causes partial parse errors, but symbols still extract
  const result = loadAndParse("react-component.tsx");

  it("extracts the default-exported function component", () => {
    const entry = byName(result, "UserCard");
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("function");
    expect(entry!.exported).toBe(true);
  });

  it("extracts Props interface and State type", () => {
    expect(byName(result, "UserProps")).toBeDefined();
    expect(byName(result, "UserProps")!.kind).toBe("interface");
    expect(byName(result, "UserState")).toBeDefined();
    expect(byName(result, "UserState")!.kind).toBe("type");
  });

  // Requires Fix 1: arrow function exports
  it.skip("extracts arrow function hooks as kind=function with signatures", () => {
    const hooks = ["useCounter", "useFetch", "useDebounce"];
    for (const name of hooks) {
      const entry = byName(result, name);
      expect(entry, `${name} should exist`).toBeDefined();
      expect(entry!.kind, `${name} should be function`).toBe("function");
      expect(entry!.signature, `${name} should have a signature`).toBeDefined();
    }
  });

  // Requires Fix 1: arrow function exports
  it.skip("extracts formatDisplayName as kind=function", () => {
    const entry = byName(result, "formatDisplayName");
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe("function");
    expect(entry!.signature).toContain("first: string");
  });

  it("jump table covers all exported symbols", () => {
    const jumpSymbols = result.jumpTable?.map((j) => j.symbol) ?? [];
    expect(jumpSymbols).toContain("UserCard");
    expect(jumpSymbols).toContain("UserProps");
    expect(jumpSymbols).toContain("UserState");
  });

  it("outline JSON fits in context budget (under 4KB)", () => {
    const size = Buffer.byteLength(JSON.stringify(result.entries), "utf-8");
    expect(size).toBeLessThan(4096);
  });

  it("still extracts symbols despite JSX causing partial parse", () => {
    // JSX triggers parse errors in the TS grammar, but recovery is good
    expect(result.entries.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Express router (arrow handler exports)
// ---------------------------------------------------------------------------
describe("audit: express-router", () => {
  const result = loadAndParse("express-router.ts");

  it("extracts both middleware functions as kind=function", () => {
    expect(byName(result, "authenticate")!.kind).toBe("function");
    expect(byName(result, "rateLimit")!.kind).toBe("function");
  });

  it("extracts RouteParams interface and HandlerFn type", () => {
    expect(byName(result, "RouteParams")!.kind).toBe("interface");
    expect(byName(result, "HandlerFn")!.kind).toBe("type");
  });

  it("extracts all 15 route handler exports", () => {
    const handlers = [
      "listUsers", "getUser", "createUser", "updateUser", "deleteUser",
      "listPosts", "getPost", "createPost", "updatePost", "deletePost",
      "listComments", "getComment", "createComment", "searchUsers", "healthCheck",
    ];
    for (const name of handlers) {
      expect(byName(result, name), `${name} should exist`).toBeDefined();
      expect(byName(result, name)!.exported, `${name} should be exported`).toBe(true);
    }
  });

  it("jump table has entries for all handlers", () => {
    const jumpSymbols = result.jumpTable?.map((j) => j.symbol) ?? [];
    expect(jumpSymbols.length).toBeGreaterThanOrEqual(19); // 15 handlers + 2 functions + 2 types
  });

  // Requires Fix 1: arrow function exports
  it.skip("handler exports have kind=function with signatures", () => {
    const entry = byName(result, "listUsers");
    expect(entry!.kind).toBe("function");
    expect(entry!.signature).toBeDefined();
    expect(entry!.signature).toContain("Request");
  });
});

// ---------------------------------------------------------------------------
// Re-exports (barrel file)
// ---------------------------------------------------------------------------
describe("audit: re-exports", () => {
  const result = loadAndParse("re-exports.ts");

  it("extracts local declarations alongside re-exports", () => {
    expect(byName(result, "createApp")).toBeDefined();
    expect(byName(result, "createApp")!.kind).toBe("function");
  });

  // Requires Fix 3: re-export extraction
  it.skip("extracts named re-exports", () => {
    expect(byName(result, "UserCard")).toBeDefined();
    expect(byName(result, "authenticate")).toBeDefined();
  });

  // Requires Fix 3: re-export extraction
  it.skip("extracts type re-exports", () => {
    expect(byName(result, "UserProps")).toBeDefined();
    expect(byName(result, "RouteParams")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// God class (30+ methods, varied kinds)
// ---------------------------------------------------------------------------
describe("audit: god-class", () => {
  const result = loadAndParse("god-class.ts");

  it("extracts DataService class", () => {
    const cls = byName(result, "DataService");
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe("class");
    expect(cls!.exported).toBe(true);
  });

  it("extracts 20+ method children", () => {
    const cls = byName(result, "DataService");
    expect(cls!.children).toBeDefined();
    expect(cls!.children!.length).toBeGreaterThanOrEqual(20);
  });

  it("method children have signatures", () => {
    const cls = byName(result, "DataService");
    const findById = cls!.children!.find((m) => m.name === "findById");
    expect(findById).toBeDefined();
    expect(findById!.signature).toContain("id: string");
  });

  it("includes async methods", () => {
    const cls = byName(result, "DataService");
    const fetch = cls!.children!.find((m) => m.name === "fetch");
    expect(fetch).toBeDefined();
  });

  it("includes methods with complex signatures", () => {
    const cls = byName(result, "DataService");
    const query = cls!.children!.find((m) => m.name === "query");
    expect(query).toBeDefined();
    expect(query!.signature).toContain("filter");
  });

  it("jump table entry for class spans full body", () => {
    const jump = result.jumpTable?.find((j) => j.symbol === "DataService");
    expect(jump).toBeDefined();
    expect(jump!.end - jump!.start).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Mixed declarations
// ---------------------------------------------------------------------------
describe("audit: mixed-declarations", () => {
  const result = loadAndParse("mixed-declarations.ts");

  it("extracts interfaces", () => {
    expect(byName(result, "Config")!.kind).toBe("interface");
    expect(byName(result, "Logger")!.kind).toBe("interface");
  });

  it("extracts types", () => {
    expect(byName(result, "Status")!.kind).toBe("type");
    expect(byName(result, "Result")!.kind).toBe("type");
  });

  it("extracts classes with methods", () => {
    const server = byName(result, "Server");
    expect(server!.kind).toBe("class");
    expect(server!.children!.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts regular functions", () => {
    expect(byName(result, "createServer")!.kind).toBe("function");
    expect(byName(result, "createClient")!.kind).toBe("function");
    expect(byName(result, "parseConfig")!.kind).toBe("function");
  });

  it("detects exported vs non-exported", () => {
    expect(byName(result, "createServer")!.exported).toBe(true);
    expect(byName(result, "internalHelper")!.exported).toBe(false);
    expect(byName(result, "InternalCache")!.exported).toBe(false);
  });

  // Requires Fix 2: enum extraction
  it.skip("extracts enums", () => {
    const logLevel = byName(result, "LogLevel");
    expect(logLevel).toBeDefined();
    expect(logLevel!.kind).toBe("enum");
    expect(logLevel!.exported).toBe(true);

    const httpMethod = byName(result, "HttpMethod");
    expect(httpMethod).toBeDefined();
    expect(httpMethod!.kind).toBe("enum");
  });
});

// ---------------------------------------------------------------------------
// Dense code (long signatures, generics)
// ---------------------------------------------------------------------------
describe("audit: dense-code", () => {
  const result = loadAndParse("dense-code.ts");

  it("does not crash on dense code", () => {
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("extracts symbols despite complex generics causing partial parse", () => {
    // Some dense generic patterns trigger tree-sitter errors but symbols recover
    expect(result.entries.length).toBeGreaterThan(3);
  });

  it("truncates long signatures to under 200 chars", () => {
    for (const entry of result.entries) {
      if (entry.signature) {
        expect(entry.signature.length, `${entry.name} signature too long`).toBeLessThanOrEqual(200);
      }
    }
  });

  it("extracts TypedEventEmitter class with methods", () => {
    const cls = byName(result, "TypedEventEmitter");
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe("class");
    expect(cls!.children!.length).toBeGreaterThanOrEqual(3);
  });

  it("extracts utility types", () => {
    expect(byName(result, "DeepPartial")!.kind).toBe("type");
    expect(byName(result, "DeepRequired")!.kind).toBe("type");
    expect(byName(result, "DeepReadonly")!.kind).toBe("type");
  });

  it("extracts ComplexConfig interface", () => {
    expect(byName(result, "ComplexConfig")!.kind).toBe("interface");
  });

  it("jump table line ranges are valid", () => {
    for (const jump of result.jumpTable ?? []) {
      expect(jump.start, `${jump.symbol} start`).toBeGreaterThan(0);
      expect(jump.end, `${jump.symbol} end`).toBeGreaterThanOrEqual(jump.start);
    }
  });
});

// ---------------------------------------------------------------------------
// Decorated class (NestJS-style)
// ---------------------------------------------------------------------------
describe("audit: decorated-class", () => {
  // Decorators may cause partial parse in some tree-sitter versions
  const result = loadAndParse("decorated-class.ts");

  it("extracts symbols despite decorators causing partial parse", () => {
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("extracts DTO interfaces", () => {
    expect(byName(result, "CreateUserDto")!.kind).toBe("interface");
    expect(byName(result, "UpdateUserDto")!.kind).toBe("interface");
  });

  it("extracts the decorated UserService class", () => {
    const cls = byName(result, "UserService");
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe("class");
    expect(cls!.exported).toBe(true);
  });

  it("extracts UserService methods", () => {
    const cls = byName(result, "UserService");
    expect(cls!.children).toBeDefined();
    const methodNames = cls!.children!.map((m) => m.name);
    expect(methodNames).toContain("findAll");
    expect(methodNames).toContain("findOne");
    expect(methodNames).toContain("create");
    expect(methodNames).toContain("update");
    expect(methodNames).toContain("remove");
  });

  it("extracts the decorated UserController class", () => {
    const cls = byName(result, "UserController");
    expect(cls).toBeDefined();
    expect(cls!.kind).toBe("class");
    expect(cls!.exported).toBe(true);
  });

  it("extracts UserController methods despite decorators", () => {
    const cls = byName(result, "UserController");
    expect(cls!.children).toBeDefined();
    const methodNames = cls!.children!.map((m) => m.name);
    expect(methodNames).toContain("findAll");
    expect(methodNames).toContain("findOne");
    expect(methodNames).toContain("create");
    expect(methodNames).toContain("update");
    expect(methodNames).toContain("remove");
  });
});
