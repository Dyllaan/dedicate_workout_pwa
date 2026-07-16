export type LogoutCallback = () => void | Promise<void>;
export type TokenUpdateCallback = (accessToken: string) => void;

type SessionTransportCallbacks = {
  onLogout: LogoutCallback | null;
  onTokenUpdate: TokenUpdateCallback | null;
};

let accessToken: string | null = null;
let sessionRecoveryEnabled = false;
let callbacks: SessionTransportCallbacks = {
  onLogout: null,
  onTokenUpdate: null,
};

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function isSessionRecoveryEnabled() {
  return sessionRecoveryEnabled;
}

export function setSessionRecoveryEnabled(enabled: boolean) {
  sessionRecoveryEnabled = enabled;
}

export function setupSessionTransport(
  onLogout: LogoutCallback,
  onTokenUpdate: TokenUpdateCallback,
) {
  callbacks = {
    onLogout,
    onTokenUpdate,
  };
}

export async function notifyLogout() {
  await callbacks.onLogout?.();
}

export function notifyAccessTokenUpdated(nextAccessToken: string) {
  callbacks.onTokenUpdate?.(nextAccessToken);
}
