import type { EdictProjectionProvider } from "./edict-projection.js";

export interface ProjectionProviderBinding {
  readonly kind: "edict";
  readonly provider: EdictProjectionProvider;
}

export interface ProjectionProviderRegistration {
  readonly language: string;
  readonly extensions: readonly string[];
  readonly provider: ProjectionProviderBinding;
}

export interface ProjectionProviderResolution {
  readonly language: string;
  readonly provider: ProjectionProviderBinding;
}

export interface ProjectionProviderRegistry {
  register(registration: ProjectionProviderRegistration): ProjectionProviderRegistry;
  resolve(opts: {
    readonly path: string;
    readonly language?: string | null | undefined;
  }): ProjectionProviderResolution | null;
}

export class ProjectionProviderRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionProviderRegistryError";
  }
}

export function createProjectionProviderRegistry(
  registrations: readonly ProjectionProviderRegistration[] = [],
): ProjectionProviderRegistry {
  const registry = new ProjectionProviderRegistryImpl();
  for (const registration of registrations) {
    registry.register(registration);
  }
  return registry;
}

class ProjectionProviderRegistryImpl implements ProjectionProviderRegistry {
  readonly #byLanguage = new Map<string, ProjectionProviderResolution>();
  readonly #byExtension = new Map<string, ProjectionProviderResolution>();

  register(registration: ProjectionProviderRegistration): ProjectionProviderRegistry {
    const language = normalizeLanguage(registration.language, "projection provider language");
    if (this.#byLanguage.has(language)) {
      throw new ProjectionProviderRegistryError(`projection provider language ${language} is already registered`);
    }
    if (registration.extensions.length === 0) {
      throw new ProjectionProviderRegistryError(`projection provider ${language} must register at least one extension`);
    }
    const resolution = { language, provider: registration.provider };

    const seenExtensions = new Set<string>();
    const extensions: string[] = [];
    for (const rawExtension of registration.extensions) {
      const extension = normalizeExtension(rawExtension);
      if (seenExtensions.has(extension)) {
        throw new ProjectionProviderRegistryError(
          `projection provider extension ${extension} is duplicated in ${language}`,
        );
      }
      if (this.#byExtension.has(extension)) {
        throw new ProjectionProviderRegistryError(`projection provider extension ${extension} is already registered`);
      }
      seenExtensions.add(extension);
      extensions.push(extension);
    }

    this.#byLanguage.set(language, resolution);
    for (const extension of extensions) {
      this.#byExtension.set(extension, resolution);
    }

    return this;
  }

  resolve(opts: {
    readonly path: string;
    readonly language?: string | null | undefined;
  }): ProjectionProviderResolution | null {
    const language = normalizeOptionalLanguage(opts.language);
    if (language !== null) {
      return this.#byLanguage.get(language) ?? null;
    }

    const extension = extensionForPath(opts.path);
    if (extension === null) {
      return null;
    }
    return this.#byExtension.get(extension) ?? null;
  }
}

function normalizeOptionalLanguage(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeLanguage(value, "projection language override");
}

function normalizeLanguage(value: string, label: string): string {
  const language = value.trim().toLowerCase();
  if (language.length === 0) {
    throw new ProjectionProviderRegistryError(`${label} must not be empty`);
  }
  return language;
}

function normalizeExtension(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const extension = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  if (extension.length <= 1) {
    throw new ProjectionProviderRegistryError("projection provider extension must not be empty");
  }
  return extension;
}

function extensionForPath(path: string): string | null {
  const leaf = path.split(/[\\/]/u).pop() ?? "";
  const dotIndex = leaf.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === leaf.length - 1) {
    return null;
  }
  return leaf.slice(dotIndex).toLowerCase();
}
