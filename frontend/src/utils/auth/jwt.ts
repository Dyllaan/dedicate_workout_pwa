type JwtPayload = {
  sub?: string;
  [key: string]: unknown;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(`${normalized}${padding}`);
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(decodeBase64Url(parts[1] ?? ""));
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return null;
    }

    const sub = typeof payload.sub === "string" ? payload.sub : undefined;
    return { ...payload, sub };
  } catch {
    return null;
  }
}
