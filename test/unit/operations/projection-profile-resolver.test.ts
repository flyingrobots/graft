import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CanonicalJsonCodec } from "../../../src/adapters/canonical-json.js";
import {
  ProjectionProfileResolverError,
  createProjectionProfileResolver,
} from "../../../src/operations/projection-profile-resolver.js";

const BASE_DIGEST = "sha256:1111111111111111111111111111111111111111111111111111111111111111";
const ECHO_DIGEST = "sha256:2222222222222222222222222222222222222222222222222222222222222222";
const LAWPACK_DIGEST = "sha256:3333333333333333333333333333333333333333333333333333333333333333";
const PROFILE_DIGEST_DOMAIN = "graft.projection-profile/v1";
const ROUTE_DIGEST_DOMAIN = "graft.projection-route/v1";
const CODEC = new CanonicalJsonCodec();

function digestReview(domain: string, value: unknown): string {
  return `sha256:${createHash("sha256").update(CODEC.encode([domain, value])).digest("hex")}`;
}

function baseConfig() {
  return {
    profiles: [
      {
        id: "wesley-base",
        language: "wesley-sdl",
        provider: "wesley",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
        ],
      },
      {
        id: "echo-contract-sdl",
        language: "wesley-sdl",
        provider: "wesley",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
          { coordinate: "echo.graphql-contract-descriptors/v1", digest: ECHO_DIGEST },
        ],
      },
      {
        id: "edict-lawpack-sdl",
        language: "wesley-sdl",
        provider: "wesley",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
          { coordinate: "edict.lawpack-descriptors/v1", digest: LAWPACK_DIGEST },
        ],
      },
    ],
    routes: [
      {
        profileId: "echo-contract-sdl",
        include: ["schemas/echo/**/*.graphql", "schemas/echo/**/*.graphqls"],
        exclude: ["schemas/echo/generated/**"],
      },
      {
        profileId: "edict-lawpack-sdl",
        include: ["lawpacks/**/*.graphql", "lawpacks/**/*.graphqls"],
      },
    ],
    extensionFallbacks: [
      {
        language: "wesley-sdl",
        profileId: "wesley-base",
        fileExtensions: [".graphql", ".graphqls"],
      },
    ],
  } as const;
}

describe("projection profile resolver", () => {
  it("resolves project routes with authority and routing digests", () => {
    const resolver = createProjectionProfileResolver(baseConfig());
    const result = resolver.resolve({ path: "schemas/echo/schema.graphqls" });

    expect(result).toMatchObject({
      state: "resolved",
      authority: {
        language: "wesley-sdl",
        provider: "wesley",
        profileId: "echo-contract-sdl",
        resolutionSource: "project_config",
        extensions: [
          { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
          { coordinate: "echo.graphql-contract-descriptors/v1", digest: ECHO_DIGEST },
        ],
      },
    });
    expect(result.state).toBe("resolved");
    if (result.state !== "resolved") {
      throw new Error("expected project route resolution");
    }
    expect(result.authority.profileDigest).toBe(digestReview(PROFILE_DIGEST_DOMAIN, {
      id: "echo-contract-sdl",
      language: "wesley-sdl",
      provider: "wesley",
      extensions: [
        { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
        { coordinate: "echo.graphql-contract-descriptors/v1", digest: ECHO_DIGEST },
      ],
    }));
    expect(result.authority.routingDigest).toBe(digestReview(ROUTE_DIGEST_DOMAIN, {
      profileId: "echo-contract-sdl",
      include: ["schemas/echo/**/*.graphql", "schemas/echo/**/*.graphqls"],
      exclude: ["schemas/echo/generated/**"],
    }));
  });

  it("uses explicit nonblank profile overrides before project routes", () => {
    const resolver = createProjectionProfileResolver(baseConfig());
    const result = resolver.resolve({
      path: "schemas/echo/schema.graphqls",
      profile: " wesley-base ",
    });

    expect(result).toMatchObject({
      state: "resolved",
      authority: {
        profileId: "wesley-base",
        resolutionSource: "explicit",
      },
    });
    expect(result.state).toBe("resolved");
    if (result.state !== "resolved") {
      throw new Error("expected explicit profile resolution");
    }
    expect(result.authority).not.toHaveProperty("routingDigest");
  });

  it("treats blank profile overrides as absent", () => {
    const resolver = createProjectionProfileResolver(baseConfig());

    expect(resolver.resolve({
      path: "schemas/echo/schema.graphqls",
      profile: "   ",
    })).toMatchObject({
      state: "resolved",
      authority: {
        profileId: "echo-contract-sdl",
        resolutionSource: "project_config",
      },
    });
  });

  it("returns structured failures for unknown profiles and no provider", () => {
    const resolver = createProjectionProfileResolver(baseConfig());

    expect(resolver.resolve({ path: "scratch.graphqls", profile: "missing" })).toEqual({
      state: "failed",
      failure: {
        kind: "unknown_profile",
        message: "Projection profile missing is not configured",
        profileId: "missing",
      },
    });

    expect(resolver.resolve({ path: "notes.txt" })).toEqual({
      state: "failed",
      failure: {
        kind: "no_provider",
        message: "No projection profile matches notes.txt",
        path: "notes.txt",
      },
    });
  });

  it("fails ambiguous project route matches without choosing the first route", () => {
    const resolver = createProjectionProfileResolver({
      ...baseConfig(),
      routes: [
        { profileId: "echo-contract-sdl", include: ["schemas/**/*.graphqls"] },
        { profileId: "edict-lawpack-sdl", include: ["schemas/**/*.graphqls"] },
      ],
    });

    expect(resolver.resolve({ path: "schemas/shared/schema.graphqls" })).toEqual({
      state: "failed",
      failure: {
        kind: "ambiguous_profile",
        message: "Projection path schemas/shared/schema.graphqls matches multiple profiles",
        path: "schemas/shared/schema.graphqls",
        matchingProfileIds: ["echo-contract-sdl", "edict-lawpack-sdl"],
      },
    });
  });

  it("respects route excludes before extension fallback", () => {
    const resolver = createProjectionProfileResolver(baseConfig());

    expect(resolver.resolve({ path: "schemas/echo/generated/schema.graphqls" })).toMatchObject({
      state: "resolved",
      authority: {
        profileId: "wesley-base",
        resolutionSource: "extension_fallback",
      },
    });
  });

  it("keeps profile and route digests independent and deterministic", () => {
    const resolver = createProjectionProfileResolver(baseConfig());
    const reordered = createProjectionProfileResolver({
      profiles: [...baseConfig().profiles].reverse(),
      routes: [...baseConfig().routes].reverse(),
      extensionFallbacks: baseConfig().extensionFallbacks,
    });
    const routeChanged = createProjectionProfileResolver({
      ...baseConfig(),
      routes: [
        {
          profileId: "echo-contract-sdl",
          include: ["contracts/echo/**/*.graphqls"],
        },
      ],
    });
    const profileChanged = createProjectionProfileResolver({
      ...baseConfig(),
      profiles: baseConfig().profiles.map((profile) =>
        profile.id === "echo-contract-sdl"
          ? {
              ...profile,
              extensions: [
                { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
                { coordinate: "echo.graphql-contract-descriptors/v1", digest: LAWPACK_DIGEST },
              ],
            }
          : profile,
      ),
    });

    const originalRoute = resolver.resolve({ path: "schemas/echo/schema.graphqls" });
    const reorderedRoute = reordered.resolve({ path: "schemas/echo/schema.graphqls" });
    const routeOnly = routeChanged.resolve({ path: "contracts/echo/schema.graphqls" });
    const profileOnly = profileChanged.resolve({ path: "schemas/echo/schema.graphqls" });

    expect(originalRoute.state).toBe("resolved");
    expect(reorderedRoute.state).toBe("resolved");
    expect(routeOnly.state).toBe("resolved");
    expect(profileOnly.state).toBe("resolved");
    if (
      originalRoute.state !== "resolved" ||
      reorderedRoute.state !== "resolved" ||
      routeOnly.state !== "resolved" ||
      profileOnly.state !== "resolved"
    ) {
      throw new Error("expected resolved profile fixtures");
    }

    expect(reorderedRoute.authority).toEqual(originalRoute.authority);
    expect(routeOnly.authority.profileDigest).toBe(originalRoute.authority.profileDigest);
    expect(routeOnly.authority.routingDigest).not.toBe(originalRoute.authority.routingDigest);
    expect(profileOnly.authority.profileDigest).not.toBe(originalRoute.authority.profileDigest);
  });

  it("rejects invalid profile configuration before resolution", () => {
    expect(() => createProjectionProfileResolver({
      ...baseConfig(),
      profiles: [
        ...baseConfig().profiles,
        {
          id: "wesley-base",
          language: "wesley-sdl",
          provider: "wesley",
          extensions: [
            { coordinate: "wesley.graphql-sdl/v1", digest: BASE_DIGEST },
          ],
        },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: [
        {
          id: "bad-digest",
          language: "wesley-sdl",
          provider: "wesley",
          extensions: [
            { coordinate: "wesley.graphql-sdl/v1", digest: "sha256:ABC" },
          ],
        },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      routes: [
        { profileId: "missing", include: ["schemas/**/*.graphqls"] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      routes: [
        { profileId: "wesley-base", include: [] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      routes: [
        { profileId: "wesley-base", include: ["schemas/**/*.graphqls", "!schemas/private/**"] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      extensionFallbacks: [
        { language: "wesley-sdl", profileId: "wesley-base", fileExtensions: ["graphql*"] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      extensionFallbacks: [
        { language: "wesley-sdl", profileId: "wesley-base", fileExtensions: ["schema.graphqls"] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: baseConfig().profiles,
      extensionFallbacks: [
        { language: "wesley-sdl", profileId: "wesley-base", fileExtensions: ["schema/graphqls"] },
      ],
    })).toThrow(ProjectionProfileResolverError);

    expect(() => createProjectionProfileResolver({
      profiles: [
        ...baseConfig().profiles,
        {
          id: "rust-profile",
          language: "rust",
          provider: "rust-provider",
          extensions: [
            { coordinate: "rust.syntax/v1", digest: BASE_DIGEST },
          ],
        },
      ],
      extensionFallbacks: [
        { language: "wesley-sdl", profileId: "rust-profile", fileExtensions: [".rs"] },
      ],
    })).toThrow(ProjectionProfileResolverError);
  });
});
