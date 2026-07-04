import { describe, expect, it } from "vitest";
import type { EdictProjectionProvider } from "../../../src/operations/edict-projection.js";
import type { WesleyProjectionProvider } from "../../../src/operations/wesley-projection.js";
import {
  ProjectionProviderRegistryError,
  createProjectionProviderRegistry,
} from "../../../src/operations/projection-provider-registry.js";

const edictProvider: EdictProjectionProvider = {
  project(input) {
    return {
      language: "edict",
      name: input.name,
      basis: input.basis ?? null,
      syntax: { state: "not_requested" },
      diagnostics: { items: [] },
      core: { state: "not_requested" },
      targetIr: { state: "not_requested" },
      status: { status: "ok", checked: 1, errors: 0, exitCode: 0 },
    };
  },
};

const wesleyProvider: WesleyProjectionProvider = {
  project(input) {
    return {
      language: "wesley-sdl",
      name: input.name,
      basis: input.basis ?? null,
      syntax: { state: "not_requested" },
      diagnostics: { items: [] },
      digests: { state: "not_requested" },
      payloads: {},
      status: { status: "ok", checked: 1, errors: 0 },
    };
  },
};

describe("projection provider registry", () => {
  it("routes providers by case-insensitive file extension", () => {
    const registry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProvider },
    });

    expect(registry.resolve({ path: "demo.edict" })).toEqual({
      language: "edict",
      provider: { kind: "edict", provider: edictProvider },
    });
    expect(registry.resolve({ path: "DEMO.EDICT" })).toEqual({
      language: "edict",
      provider: { kind: "edict", provider: edictProvider },
    });
  });

  it("routes providers by explicit language id before path extension", () => {
    const registry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProvider },
    });

    expect(registry.resolve({ path: "untitled-1", language: "Edict" })).toEqual({
      language: "edict",
      provider: { kind: "edict", provider: edictProvider },
    });
  });

  it("routes Wesley providers by GraphQL SDL extensions", () => {
    const registry = createProjectionProviderRegistry().register({
      language: "wesley-sdl",
      extensions: [".graphql", ".graphqls"],
      provider: { kind: "wesley", provider: wesleyProvider },
    });

    expect(registry.resolve({ path: "schemas/demo.graphql" })).toEqual({
      language: "wesley-sdl",
      provider: { kind: "wesley", provider: wesleyProvider },
    });
    expect(registry.resolve({ path: "schemas/DEMO.GRAPHQLS" })).toEqual({
      language: "wesley-sdl",
      provider: { kind: "wesley", provider: wesleyProvider },
    });
  });

  it("returns null when no provider matches", () => {
    const registry = createProjectionProviderRegistry();

    expect(registry.resolve({ path: "notes.txt" })).toBeNull();
    expect(registry.resolve({ path: "demo.edict", language: "wesley-sdl" })).toBeNull();
  });

  it("treats blank language overrides as absent", () => {
    const registry = createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [".edict"],
      provider: { kind: "edict", provider: edictProvider },
    });

    expect(registry.resolve({ path: "demo.edict", language: "" })).toEqual({
      language: "edict",
      provider: { kind: "edict", provider: edictProvider },
    });
    expect(registry.resolve({ path: "untitled-1", language: "  " })).toBeNull();
  });

  it("rejects ambiguous duplicate languages and extensions", () => {
    expect(() => createProjectionProviderRegistry([
      {
        language: "edict",
        extensions: [".edict"],
        provider: { kind: "edict", provider: edictProvider },
      },
      {
        language: "EDICT",
        extensions: [".edict2"],
        provider: { kind: "edict", provider: edictProvider },
      },
    ])).toThrow(ProjectionProviderRegistryError);

    expect(() => createProjectionProviderRegistry([
      {
        language: "edict",
        extensions: [".edict"],
        provider: { kind: "edict", provider: edictProvider },
      },
      {
        language: "edict-alt",
        extensions: ["EDICT"],
        provider: { kind: "edict", provider: edictProvider },
      },
    ])).toThrow(ProjectionProviderRegistryError);
  });

  it("rejects registrations without extensions", () => {
    expect(() => createProjectionProviderRegistry().register({
      language: "edict",
      extensions: [],
      provider: { kind: "edict", provider: edictProvider },
    })).toThrow(ProjectionProviderRegistryError);
  });

  it("does not retain partial registrations after validation failure", () => {
    const registry = createProjectionProviderRegistry();

    expect(() => registry.register({
      language: "edict",
      extensions: [""],
      provider: { kind: "edict", provider: edictProvider },
    })).toThrow(ProjectionProviderRegistryError);

    expect(registry.resolve({ path: "demo.edict", language: "edict" })).toBeNull();
    expect(registry.resolve({ path: "demo.edict" })).toBeNull();
  });
});
