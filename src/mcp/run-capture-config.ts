export interface RunCaptureConfig {
  readonly enabled: boolean;
  readonly persistLogs: boolean;
  readonly redactLogs: boolean;
}

export interface ResolveRunCaptureConfigOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly overrides?: Partial<RunCaptureConfig>;
}

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if ([ "0", "false", "no", "off" ].includes(normalized)) return false;
  if ([ "1", "true", "yes", "on" ].includes(normalized)) return true;
  return fallback;
}

export function resolveRunCaptureConfig(
  options: ResolveRunCaptureConfigOptions = {},
): RunCaptureConfig {
  const env = options.env ?? process.env;
  const base: RunCaptureConfig = {
    enabled: parseBooleanFlag(env["GRAFT_ENABLE_RUN_CAPTURE"], true),
    persistLogs: parseBooleanFlag(env["GRAFT_RUN_CAPTURE_PERSIST"], true),
    redactLogs: parseBooleanFlag(env["GRAFT_RUN_CAPTURE_REDACT"], true),
  };
  return {
    ...base,
    ...options.overrides,
  };
}
