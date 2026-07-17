import type { MeResponse, User } from "@/features/auth/types/User";
import { decodeJwt } from "@/features/auth/utils/jwt";

export function withDerivedSub(userData: User): User {
  const payload = decodeJwt(userData.accessToken);
  const sub = typeof payload?.sub === "string" ? payload.sub : userData.sub;
  return { ...userData, sub };
}

export function buildUserFromMeResponse(response: MeResponse, accessToken: string): User {
  const payload = decodeJwt(accessToken);
return {
    username: response.username,
    mfaEnabled: response.mfaEnabled,
    accessToken,
    sub: typeof payload?.sub === "string" ? payload.sub : undefined,
  };
}
