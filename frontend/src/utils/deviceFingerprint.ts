declare global {
  interface Window {
    __FINGERPRINT_OVERRIDE__?: string;
  }
}

const STORAGE_KEY = "dedicate_device_seed";
let cachedFingerprintPromise: Promise<string> | null = null;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateSeed() {
  const storage = getStorage();
  const existing = storage?.getItem(STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const nextSeed = createSeed();

  try {
    storage?.setItem(STORAGE_KEY, nextSeed);
  } catch {
    return nextSeed;
  }

  return nextSeed;
}

function collectFingerprintParts() {
  if (typeof window === "undefined") {
    return ["server"];
  }

  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    } catch {
      return "";
    }
  })();

  const screenInfo =
    typeof window.screen === "undefined"
      ? ""
      : [
          window.screen.width,
          window.screen.height,
          window.screen.colorDepth,
        ].join("x");

  return [
    getOrCreateSeed(),
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    timezone,
    screenInfo,
  ];
}

function fallbackHash(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function sha256Hex(input: string) {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackHash(input);
  }

  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));

  return `fp-${bytes.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window !== "undefined" && window.__FINGERPRINT_OVERRIDE__) {
    return window.__FINGERPRINT_OVERRIDE__;
  }

  if (!cachedFingerprintPromise) {
    cachedFingerprintPromise = sha256Hex(collectFingerprintParts().join("|")).catch(() => {
      cachedFingerprintPromise = null;
      return "";
    });
  }

  return cachedFingerprintPromise;
}
