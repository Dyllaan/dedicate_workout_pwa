import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const STORAGE_NOTICE_ACK_KEY = "dedicate-cookie-notice-v1";

function getInitialAcknowledgedState() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(STORAGE_NOTICE_ACK_KEY) === "acknowledged";
  } catch {
    return false;
  }
}

export default function StorageNotice() {
  const { pathname } = useLocation();
  const { signedIn } = useAuth();
  const [acknowledged, setAcknowledged] = useState(getInitialAcknowledgedState);

  if (acknowledged) {
    return null;
  }

  const bottomInset = signedIn && pathname !== "/login" && pathname !== "/register"
    ? "calc(max(env(safe-area-inset-bottom, 0px), 12px) + 84px)"
    : "max(env(safe-area-inset-bottom, 0px), 12px)";

  const acknowledgeNotice = () => {
    try {
      window.localStorage.setItem(STORAGE_NOTICE_ACK_KEY, "acknowledged");
    } catch {
      // Keep the notice functional even when storage is unavailable.
    }

    setAcknowledged(true);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 px-4"
      style={{ bottom: bottomInset }}
    >
      <section
        aria-label="Cookie notice"
        className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-border bg-background/98 p-4 shadow-lg backdrop-blur"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-foreground">
                Essential cookies and storage only
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Dedicate uses essential cookies for authentication and session
                recovery. Trusted-device cookies may be set when you enable that
                feature, Cloudflare may set security or session cookies, and
                local storage is used for things like drafts and preferences. No
                tracking or analytics cookies are used.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Read the{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link
                  to="/terms"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>

            <Button
              icon={undefined}
              type="button"
              onClick={acknowledgeNotice}
              className="min-h-11 w-full sm:w-auto"
            >
              Acknowledge
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
