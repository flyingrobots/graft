import picomatch from "picomatch";
import { canonicalJsonSha256Review } from "../contracts/review-digest.js";

const PROFILE_DIGEST_DOMAIN = "graft.projection-profile/v1";
const ROUTE_DIGEST_DOMAIN = "graft.projection-route/v1";

const LOWERCASE_SHA256_REVIEW = /^sha256:[0-9a-f]{64}$/u;
const FILE_EXTENSION_SUFFIX = /^\.[a-z0-9][a-z0-9_-]*$/u;

type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface ProjectionProfileExtensionInput {
  readonly coordinate: string;
  readonly digest: string;
}

export interface ProjectionProfileInput {
  readonly id: string;
  readonly language: string;
  readonly provider: string;
  readonly extensions: readonly ProjectionProfileExtensionInput[];
  readonly options?: Readonly<Record<string, unknown>> | undefined;
}

export interface ProjectionRouteInput {
  readonly profileId: string;
  readonly include: readonly string[];
  readonly exclude?: readonly string[] | undefined;
}

export interface ProjectionExtensionFallbackInput {
  readonly language: string;
  readonly profileId: string;
  readonly fileExtensions: readonly string[];
}

export interface ProjectionProfileResolverConfig {
  readonly profiles: readonly ProjectionProfileInput[];
  readonly routes?: readonly ProjectionRouteInput[] | undefined;
  readonly extensionFallbacks?: readonly ProjectionExtensionFallbackInput[] | undefined;
}

export interface ProjectionProfileExtension {
  readonly coordinate: string;
  readonly digest: string;
}

export interface ResolvedAuthorityContext {
  readonly language: string;
  readonly profileId: string;
  readonly profileDigest: string;
  readonly routingDigest?: string | undefined;
  readonly provider: string;
  readonly extensions: readonly ProjectionProfileExtension[];
  readonly resolutionSource: "explicit" | "project_config" | "extension_fallback";
}

export type ProjectionRoutingFailureKind =
  | "no_provider"
  | "unknown_profile"
  | "ambiguous_profile"
  | "profile_config_invalid";

export interface ProjectionRoutingFailure {
  readonly kind: ProjectionRoutingFailureKind;
  readonly message: string;
  readonly path?: string | undefined;
  readonly profileId?: string | undefined;
  readonly matchingProfileIds?: readonly string[] | undefined;
}

export type ProjectionAuthorityResolution =
  | {
      readonly state: "resolved";
      readonly authority: ResolvedAuthorityContext;
    }
  | {
      readonly state: "failed";
      readonly failure: ProjectionRoutingFailure;
    };

export interface ProjectionProfileResolver {
  resolve(opts: {
    readonly path: string;
    readonly profile?: string | null | undefined;
    readonly language?: string | null | undefined;
  }): ProjectionAuthorityResolution;
}

interface NormalizedProfile {
  readonly id: string;
  readonly language: string;
  readonly provider: string;
  readonly extensions: readonly ProjectionProfileExtension[];
  readonly options?: JsonValue | undefined;
  readonly profileDigest: string;
}

interface NormalizedRoute {
  readonly profileId: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly routingDigest: string;
  readonly matches: (path: string) => boolean;
}

interface NormalizedExtensionFallback {
  readonly language: string;
  readonly profileId: string;
  readonly fileExtensions: readonly string[];
}

type ExtensionFallbackResolution =
  | { readonly state: "matched"; readonly profileId: string }
  | {
      readonly state: "failed";
      readonly failure: ProjectionRoutingFailure;
    };

export class ProjectionProfileResolverError extends Error {
  readonly kind = "profile_config_invalid" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectionProfileResolverError";
  }
}

export function createProjectionProfileResolver(config: ProjectionProfileResolverConfig): ProjectionProfileResolver {
  return new ProjectionProfileResolverImpl(config);
}

class ProjectionProfileResolverImpl implements ProjectionProfileResolver {
  readonly #profiles = new Map<string, NormalizedProfile>();
  readonly #routes: readonly NormalizedRoute[];
  readonly #extensionFallbacks: readonly NormalizedExtensionFallback[];

  constructor(config: ProjectionProfileResolverConfig) {
    for (const profileInput of config.profiles) {
      const profile = normalizeProfile(profileInput);
      if (this.#profiles.has(profile.id)) {
        fail(`Projection profile ${profile.id} is already configured`);
      }
      this.#profiles.set(profile.id, profile);
    }

    this.#routes = Object.freeze((config.routes ?? []).map((route) => normalizeRoute(route, this.#profiles)));
    this.#extensionFallbacks = Object.freeze(
      normalizeExtensionFallbacks(config.extensionFallbacks ?? [], this.#profiles),
    );
  }

  resolve(opts: {
    readonly path: string;
    readonly profile?: string | null | undefined;
    readonly language?: string | null | undefined;
  }): ProjectionAuthorityResolution {
    const explicitProfileId = normalizeOptionalText(opts.profile);
    if (explicitProfileId !== null) {
      const profile = this.#profiles.get(explicitProfileId);
      if (profile === undefined) {
        return failed({
          kind: "unknown_profile",
          message: `Projection profile ${explicitProfileId} is not configured`,
          profileId: explicitProfileId,
        });
      }
      return resolved(profile, "explicit");
    }

    const normalizedPath = normalizePath(opts.path);
    const matchingRoutes = this.#routes.filter((route) => route.matches(normalizedPath));
    if (matchingRoutes.length > 1) {
      return failed({
        kind: "ambiguous_profile",
        message: `Projection path ${normalizedPath} matches multiple profiles`,
        path: normalizedPath,
        matchingProfileIds: matchingRoutes
          .map((route) => route.profileId)
          .sort(),
      });
    }
    if (matchingRoutes.length === 1) {
      const route = matchingRoutes[0];
      if (route === undefined) {
        fail("Projection route resolution became inconsistent");
      }
      return resolved(this.#mustProfile(route.profileId), "project_config", route.routingDigest);
    }

    const fallback = this.#resolveExtensionFallback(normalizedPath, opts.language);
    if (fallback !== null) {
      if (fallback.state === "failed") {
        return fallback;
      }
      return resolved(this.#mustProfile(fallback.profileId), "extension_fallback");
    }

    return failed({
      kind: "no_provider",
      message: `No projection profile matches ${normalizedPath}`,
      path: normalizedPath,
    });
  }

  #mustProfile(profileId: string): NormalizedProfile {
    const profile = this.#profiles.get(profileId);
    if (profile === undefined) {
      fail(`Projection route references missing profile ${profileId}`);
    }
    return profile;
  }

  #resolveExtensionFallback(
    path: string,
    rawLanguage: string | null | undefined,
  ): ExtensionFallbackResolution | null {
    const extension = extensionForPath(path);
    if (extension === null) {
      return null;
    }

    const language = normalizeOptionalLanguage(rawLanguage);
    const matches = this.#extensionFallbacks.filter((fallback) =>
      fallback.fileExtensions.includes(extension) &&
      (language === null || fallback.language === language),
    );
    if (matches.length === 0) {
      return null;
    }
    if (matches.length > 1) {
      return {
        state: "failed",
        failure: {
          kind: "ambiguous_profile",
          message: `Projection path ${path} matches multiple extension fallback profiles`,
          path,
          matchingProfileIds: matches
            .map((fallback) => fallback.profileId)
            .sort(),
        },
      };
    }
    const match = matches[0];
    if (match === undefined) {
      fail("Projection extension fallback resolution became inconsistent");
    }
    return { state: "matched", profileId: match.profileId };
  }
}

function resolved(
  profile: NormalizedProfile,
  resolutionSource: ResolvedAuthorityContext["resolutionSource"],
  routingDigest?: string,
): ProjectionAuthorityResolution {
  const authorityBase = {
    language: profile.language,
    profileId: profile.id,
    profileDigest: profile.profileDigest,
    provider: profile.provider,
    extensions: profile.extensions,
    resolutionSource,
  };
  return {
    state: "resolved",
    authority: routingDigest === undefined
      ? authorityBase
      : { ...authorityBase, routingDigest },
  };
}

function failed(failure: ProjectionRoutingFailure): ProjectionAuthorityResolution {
  return { state: "failed", failure };
}

function normalizeProfile(input: ProjectionProfileInput): NormalizedProfile {
  const id = normalizeRequiredText(input.id, "projection profile id");
  const language = normalizeLanguage(input.language, "projection profile language");
  const provider = normalizeLanguage(input.provider, "projection profile provider");
  if (input.extensions.length === 0) {
    fail(`Projection profile ${id} must declare at least one semantic extension`);
  }

  const seenCoordinates = new Set<string>();
  const extensions = input.extensions.map((extension) => {
    const coordinate = normalizeRequiredText(extension.coordinate, `projection profile ${id} extension coordinate`);
    if (seenCoordinates.has(coordinate)) {
      fail(`Projection profile ${id} duplicates extension coordinate ${coordinate}`);
    }
    seenCoordinates.add(coordinate);
    const digest = normalizeDigest(extension.digest, `projection profile ${id} extension ${coordinate} digest`);
    return Object.freeze({ coordinate, digest });
  });

  const options = input.options === undefined
    ? undefined
    : normalizeJsonValue(input.options, `projection profile ${id} options`);
  const digestExtensions = [...extensions].sort((left, right) => compareCodePoint(left.coordinate, right.coordinate));
  const digestInput = options === undefined
    ? { id, language, provider, extensions: digestExtensions }
    : { id, language, provider, extensions: digestExtensions, options };

  return Object.freeze({
    id,
    language,
    provider,
    extensions: Object.freeze(extensions),
    ...(options === undefined ? {} : { options }),
    profileDigest: digestReview(PROFILE_DIGEST_DOMAIN, digestInput),
  });
}

function normalizeRoute(
  input: ProjectionRouteInput,
  profiles: ReadonlyMap<string, NormalizedProfile>,
): NormalizedRoute {
  const profileId = normalizeRequiredText(input.profileId, "projection route profile id");
  if (!profiles.has(profileId)) {
    fail(`Projection route references missing profile ${profileId}`);
  }
  const include = normalizePatternList(input.include, `projection route ${profileId} include`, { requireNonEmpty: true });
  const exclude = normalizePatternList(input.exclude ?? [], `projection route ${profileId} exclude`, {
    requireNonEmpty: false,
  });
  const includeMatcher = picomatch([...include], { dot: true });
  const excludeMatcher = exclude.length === 0 ? null : picomatch([...exclude], { dot: true });
  return Object.freeze({
    profileId,
    include,
    exclude,
    routingDigest: digestReview(ROUTE_DIGEST_DOMAIN, { profileId, include, exclude }),
    matches(path: string): boolean {
      return includeMatcher(path) && !(excludeMatcher?.(path) ?? false);
    },
  });
}

function normalizeExtensionFallbacks(
  inputs: readonly ProjectionExtensionFallbackInput[],
  profiles: ReadonlyMap<string, NormalizedProfile>,
): readonly NormalizedExtensionFallback[] {
  const seen = new Set<string>();
  return Object.freeze(inputs.map((input) => {
    const language = normalizeLanguage(input.language, "projection extension fallback language");
    const profileId = normalizeRequiredText(input.profileId, "projection extension fallback profile id");
    const profile = profiles.get(profileId);
    if (profile === undefined) {
      fail(`Projection extension fallback references missing profile ${profileId}`);
    }
    if (profile.language !== language) {
      fail(`Projection extension fallback ${profileId} language must match its profile language`);
    }
    const fileExtensions = normalizeFileExtensionList(input.fileExtensions, `projection extension fallback ${profileId}`);
    for (const extension of fileExtensions) {
      const key = `${language}\0${extension}`;
      if (seen.has(key)) {
        fail(`Projection extension fallback for ${language} ${extension} is already configured`);
      }
      seen.add(key);
    }
    return Object.freeze({ language, profileId, fileExtensions });
  }));
}

function normalizePatternList(
  values: readonly string[],
  label: string,
  opts: { readonly requireNonEmpty: boolean },
): readonly string[] {
  if (opts.requireNonEmpty && values.length === 0) {
    fail(`${label} must include at least one glob`);
  }
  const patterns = normalizeUniqueSorted(values, label, (value) => normalizeGlobPattern(value, label));
  if (opts.requireNonEmpty && patterns.length === 0) {
    fail(`${label} must include at least one glob`);
  }
  return patterns;
}

function normalizeFileExtensionList(values: readonly string[], label: string): readonly string[] {
  if (values.length === 0) {
    fail(`${label} must include at least one file extension`);
  }
  return normalizeUniqueSorted(values, label, normalizeFileExtension);
}

function normalizeUniqueSorted(
  values: readonly string[],
  label: string,
  normalize: (value: string) => string,
): readonly string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const item = normalize(value);
    if (seen.has(item)) {
      fail(`${label} duplicates ${item}`);
    }
    seen.add(item);
    normalized.push(item);
  }
  return Object.freeze(normalized.sort());
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function normalizeOptionalLanguage(value: string | null | undefined): string | null {
  const text = normalizeOptionalText(value);
  return text === null ? null : normalizeLanguage(text, "projection language override");
}

function normalizeRequiredText(value: string, label: string): string {
  const text = value.trim();
  if (text.length === 0) {
    fail(`${label} must not be empty`);
  }
  return text;
}

function normalizeGlobPattern(value: string, label: string): string {
  const pattern = normalizeRequiredText(value, label);
  if (pattern.startsWith("!")) {
    fail(`${label} must use the exclude field instead of negated glob patterns`);
  }
  return pattern;
}

function normalizeLanguage(value: string, label: string): string {
  return normalizeRequiredText(value, label).toLowerCase();
}

function normalizeDigest(value: string, label: string): string {
  const digest = normalizeRequiredText(value, label);
  if (!LOWERCASE_SHA256_REVIEW.test(digest)) {
    fail(`${label} must be a lowercase sha256 digest`);
  }
  return digest;
}

function normalizeFileExtension(value: string): string {
  const text = normalizeRequiredText(value, "projection fallback file extension").toLowerCase();
  const extension = text.startsWith(".") ? text : `.${text}`;
  if (!FILE_EXTENSION_SUFFIX.test(extension)) {
    fail("projection fallback file extension must be a simple file suffix");
  }
  return extension;
}

function extensionForPath(path: string): string | null {
  const leaf = path.split("/").pop() ?? "";
  const dotIndex = leaf.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === leaf.length - 1) {
    return null;
  }
  return leaf.slice(dotIndex).toLowerCase();
}

function normalizePath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//u, "");
  return normalized.length === 0 ? "." : normalized;
}

function normalizeJsonValue(value: unknown, label: string, seen = new WeakSet()): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail(`${label} must be finite JSON data`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      fail(`${label} must not contain circular data`);
    }
    seen.add(value);
    try {
      const output: JsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail(`${label} must not contain sparse arrays`);
        }
        output.push(normalizeJsonValue(value[index], `${label}[${String(index)}]`, seen));
      }
      return Object.freeze(output);
    } finally {
      seen.delete(value);
    }
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value) as unknown;
    if (proto !== Object.prototype && proto !== null) {
      fail(`${label} must be plain JSON data`);
    }
    if (seen.has(value)) {
      fail(`${label} must not contain circular data`);
    }
    seen.add(value);
    try {
      const record = value as Record<string, unknown>;
      const output = Object.create(null) as Record<string, JsonValue>;
      for (const key of Object.keys(record).sort()) {
        const item = record[key];
        if (item === undefined) {
          fail(`${label}.${key} must not be undefined`);
        }
        Object.defineProperty(output, key, {
          enumerable: true,
          value: normalizeJsonValue(item, `${label}.${key}`, seen),
        });
      }
      return Object.freeze(output);
    } finally {
      seen.delete(value);
    }
  }
  fail(`${label} must be JSON data`);
}

function digestReview(domain: string, value: unknown): string {
  return canonicalJsonSha256Review(domain, value);
}

function compareCodePoint(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function fail(message: string): never {
  throw new ProjectionProfileResolverError(message);
}
