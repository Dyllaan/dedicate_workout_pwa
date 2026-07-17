import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import Back from "@/components/layout/app/Back";
import BottomNav from "@/components/layout/app/BottomNav";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import UnsavedDraftDrawer from "@/features/workout/entries/components/UnsavedDraftDrawer.tsx";
import { useWorkoutEntryDrafts } from "@/features/workout/entries/hooks/useWorkoutEntryDrafts";

interface ShellFrameProps {
  children: ReactNode;
  showBack: boolean;
  variant: "app" | "public";
  forceBottomNav?: boolean;
  "data-testid"?: string;
}

function AuthenticatedDraftRestore() {
  const drafts = useWorkoutEntryDrafts();
  const [unsavedDraftOpen, setUnsavedDraftOpen] = useState(drafts.length > 0);

  useEffect(() => {
    setUnsavedDraftOpen(drafts.length > 0);
  }, [drafts.length]);

  return (
    <UnsavedDraftDrawer
      drafts={drafts}
      open={unsavedDraftOpen}
      onOpenChange={setUnsavedDraftOpen}
    />
  );
}

export default function ShellFrame({
  children,
  showBack,
  variant,
  forceBottomNav = false,
  "data-testid": dataTestId,
}: ShellFrameProps) {
  const isAppShell = variant === "app";
  const { user } = useAuth();
  const canRestoreDrafts = isAppShell && !!user?.accessToken;

  return (
    <div
      data-testid={dataTestId}
      className={cn("ui-shell", isAppShell ? "ui-shell-app" : "ui-shell-public")}
    >
      <div className="ui-shell-frame">
        {canRestoreDrafts ? <AuthenticatedDraftRestore /> : null}
        <div
          className={cn(
            "ui-shell-scroll",
            "ui-shell-scroll-app",
          )}
        >
          {showBack ? (
            <Back />
          ) : (
            <div className="h-10"/>
          )}
          {children}
        </div>
      </div>
      {isAppShell ? <BottomNav forceVisible={forceBottomNav} /> : null}
    </div>
  );
}
