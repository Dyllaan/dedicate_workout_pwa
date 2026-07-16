const LEGACY_AUTH_STORAGE_KEYS = ["user"] as const;

export function clearLegacyAuthStorage() {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
