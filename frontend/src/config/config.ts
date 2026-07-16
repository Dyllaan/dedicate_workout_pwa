import { z } from "@/lib/zod";

const ALLOWED_CONFIG_KEYS = [
  "VITE_API_URL",
  "VITE_MIN_SETS",
  "VITE_MAX_SETS",
  "VITE_MIN_REPS",
  "VITE_MAX_REPS",
  "VITE_MIN_STRING_LENGTH",
  "VITE_MAX_STRING_LENGTH",
  "VITE_GITHUB_URL",
] as const;

type ConfigKey = (typeof ALLOWED_CONFIG_KEYS)[number];
type ConfigSource = Partial<Record<ConfigKey, string | undefined>>;

const numericConfigSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => (value == null || value === "" ? undefined : Number(value)))
  .refine((value) => value === undefined || Number.isFinite(value), "Expected a numeric configuration value");

const configSchema = z.object({
  VITE_API_URL: z.string().optional(),
  VITE_MIN_SETS: numericConfigSchema,
  VITE_MAX_SETS: numericConfigSchema,
  VITE_MIN_REPS: numericConfigSchema,
  VITE_MAX_REPS: numericConfigSchema,
  VITE_MIN_STRING_LENGTH: numericConfigSchema,
  VITE_MAX_STRING_LENGTH: numericConfigSchema,
  VITE_GITHUB_URL: z.string().optional(),
});

function getUnknownConfigKeys(source: Record<string, string | undefined>) {
  return Object.keys(source).filter(
    (key) => key.startsWith("VITE_") && !ALLOWED_CONFIG_KEYS.includes(key as ConfigKey),
  );
}

function filterKnownConfigKeys(source: Record<string, string | undefined>): ConfigSource {
  return ALLOWED_CONFIG_KEYS.reduce<ConfigSource>((acc, key) => {
    acc[key] = source[key];
    return acc;
  }, {});
}

function isLocalDevelopmentUrl(url: URL) {
  return ["localhost", "127.0.0.1"].includes(url.hostname);
}

function normalizeUrl(rawValue: string, { requireHttpsOutsideLocalhost }: { requireHttpsOutsideLocalhost: boolean }) {
  const isRootRelative = rawValue.startsWith("/");
  const normalized = new URL(rawValue, window.location.origin);

  if (!["http:", "https:"].includes(normalized.protocol)) {
    throw new Error(`Invalid URL protocol for frontend config: ${rawValue}`);
  }

  if (
    requireHttpsOutsideLocalhost &&
    normalized.protocol !== "https:" &&
    !isLocalDevelopmentUrl(normalized)
  ) {
    throw new Error(`Insecure non-HTTPS frontend config URL is not allowed: ${rawValue}`);
  }

  if (isRootRelative && normalized.origin === window.location.origin) {
    return normalized.pathname.endsWith("/") ? normalized.pathname : `${normalized.pathname}/`;
  }

  return normalized.toString().endsWith("/") ? normalized.toString() : `${normalized.toString()}/`;
}

export function parseConfig(
  buildEnv: Record<string, string | undefined>,
  runtimeEnv: Record<string, string | undefined>,
) {
  const unknownRuntimeKeys = getUnknownConfigKeys(runtimeEnv);
  if (unknownRuntimeKeys.length > 0) {
    throw new Error(`Unknown runtime config keys: ${unknownRuntimeKeys.join(", ")}`);
  }

  const unknownBuildKeys = getUnknownConfigKeys(buildEnv);
  if (unknownBuildKeys.length > 0) {
    throw new Error(`Unknown build config keys: ${unknownBuildKeys.join(", ")}`);
  }

  const parsed = configSchema.parse({
    ...filterKnownConfigKeys(buildEnv),
    ...filterKnownConfigKeys(runtimeEnv),
  });

  return {
    API_URL: normalizeUrl(parsed.VITE_API_URL ?? "/api/", {
      requireHttpsOutsideLocalhost: true,
    }),
    MIN_SETS: parsed.VITE_MIN_SETS ?? 1,
    MAX_SETS: parsed.VITE_MAX_SETS ?? 100,
    MIN_REPS: parsed.VITE_MIN_REPS ?? 0,
    MAX_REPS: parsed.VITE_MAX_REPS ?? 1000,
    MIN_STRING_LENGTH: parsed.VITE_MIN_STRING_LENGTH ?? 3,
    MAX_STRING_LENGTH: parsed.VITE_MAX_STRING_LENGTH ?? 64,
    GITHUB_URL: normalizeUrl(
      parsed.VITE_GITHUB_URL || "https://github.com/Dyllaan/dedicate_workout_pwa",
      { requireHttpsOutsideLocalhost: false },
    ),
  };
}

const buildEnv = import.meta.env as Record<string, string | undefined>;
const runtimeEnv = (window.__APP_CONFIG__ ?? {}) as Record<string, string | undefined>;

const config = parseConfig(buildEnv, runtimeEnv);

export default config;
