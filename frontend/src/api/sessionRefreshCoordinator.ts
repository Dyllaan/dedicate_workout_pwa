export type SessionRefreshResult =
  | { status: "recovered"; accessToken: string }
  | { status: "unauthenticated" }
  | { status: "failed"; error: Error };

type RefreshAttempt = () => Promise<SessionRefreshResult>;

export function createSessionRefreshCoordinator(refreshAttempt: RefreshAttempt) {
  let inFlightRecovery: Promise<SessionRefreshResult> | null = null;

  return {
    recover(): Promise<SessionRefreshResult> {
      if (!inFlightRecovery) {
        inFlightRecovery = refreshAttempt().finally(() => {
          inFlightRecovery = null;
        });
      }

      return inFlightRecovery;
    },
  };
}
