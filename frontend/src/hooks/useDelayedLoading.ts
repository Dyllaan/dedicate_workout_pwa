import { useEffect, useState } from "react";

export default function useDelayedLoading(isLoading: boolean, delayMs = 180): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setShowLoading(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isLoading]);

  return showLoading;
}
