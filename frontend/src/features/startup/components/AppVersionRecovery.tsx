import { Component, useEffect, useRef, type ReactNode } from "react";
import SplashScreen from "./SplashScreen";
import { useRegisterSW } from "../services/pwaRegister";


function reloadWindow() {
  window.location.reload();
}

const CHUNK_RELOAD_FLAG = "dedicate-chunk-reload-attempted";

function getChunkReloadAttempted() {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
  } catch {
    return false;
  }
}

function setChunkReloadAttempted() {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch {
    // Ignore storage failures and fall back to a plain reload.
  }
}

function clearChunkReloadAttempted() {
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    // Ignore storage failures and let the fallback keep working.
  }
}

function isChunkLoadError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i.test(
    message,
  );
}

function usePwaAutoReload() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  });
  const [needsRefresh] = needRefresh;
  const triggeredReloadRef = useRef(false);

  useEffect(() => {
    clearChunkReloadAttempted();
  }, []);

  useEffect(() => {
    if (!needsRefresh || triggeredReloadRef.current) {
      return;
    }

    triggeredReloadRef.current = true;

    void updateServiceWorker(true).finally(() => {
      reloadWindow();
    });
  }, [needsRefresh, updateServiceWorker]);
}

function RecoveryFallback({ error }: { error: unknown }) {
  const chunkLoadError = isChunkLoadError(error);
  const shouldAutoReload = chunkLoadError && !getChunkReloadAttempted();
  const reload = () => {
    setChunkReloadAttempted();
    reloadWindow();
  };

  useEffect(() => {
    if (!shouldAutoReload) {
      return;
    }

    reload();
  }, [shouldAutoReload]);

  return (
    <SplashScreen
      phaseLabel={chunkLoadError ? "Reloading app" : "App error"}
      message={
        chunkLoadError
          ? "We found a newer version of Dedicate. Reloading to load the latest files."
          : "We hit a startup problem. Reload the app to try again."
      }
      onReload={reload}
      canGoBack={!chunkLoadError}
    />
  );
}

class AppRecoveryBoundary extends Component<
  { children: ReactNode },
  { error: unknown | null }
> {
  state = { error: null as unknown | null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <RecoveryFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default function AppVersionRecovery({ children }: { children: ReactNode }) {
  usePwaAutoReload();

  return <AppRecoveryBoundary>{children}</AppRecoveryBoundary>;
}
