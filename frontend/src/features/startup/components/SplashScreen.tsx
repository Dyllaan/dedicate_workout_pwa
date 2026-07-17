import { AlertCircle, Dumbbell, RefreshCw, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

type SplashScreenProps = {
  phaseLabel?: string;
  message?: string;
  isOffline?: boolean;
  onRetry?: () => void;
  onReload?: () => void;
  canGoBack?: boolean;
};

export default function SplashScreen({
  phaseLabel = "Restoring session",
  message = "Preparing your training space",
  isOffline = false,
  canGoBack = false,
  onRetry,
  onReload,
}: SplashScreenProps) {
  const navigate = useNavigate();
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground"
      data-testid="startup-splash"
    >
      <div className="startup-splash-shell flex w-full max-w-md flex-col items-center text-center">
        <div className="startup-splash-icon mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
          <Dumbbell className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Dedicate
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Ready when you are.</h1>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
          {isOffline ? <WifiOff className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5 startup-splash-spinner" />}
          <span>{phaseLabel}</span>
        </div>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 w-full max-w-56 overflow-hidden rounded-full bg-muted">
          <div className="startup-splash-progress h-1.5 rounded-full bg-primary" />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Retry
            </button>
          ) : null}
          {onReload ? (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <AlertCircle className="h-4 w-4" />
              Reload
            </button>
          ) : null}
          {canGoBack ? (
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Go back
            </button>
          ) : null}
        </div>
        {isOffline ? (
          <p className="mt-4 text-xs text-muted-foreground">
            You look offline. We’ll keep the startup ready for a reconnect.
          </p>
        ) : null}
      </div>
    </main>
  );
}
