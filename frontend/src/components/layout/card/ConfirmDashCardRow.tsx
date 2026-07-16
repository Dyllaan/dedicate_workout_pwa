import { useState, useEffect, useRef } from "react";
import { DashCardRow } from "./DashCardRow";
import type { LucideIcon } from "lucide-react";

type ConfirmDashCardRowProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  actionLabel?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive" | "active";
  onClick: () => void;
  timeoutMs?: number;
  disabled?: boolean;
};

export function ConfirmDashCardRow({
  description,
  actionLabel = "",
  confirmLabel = "Confirm",
  onClick,
  timeoutMs = 3000,
  variant = "default",
  disabled = false,
  label,
  icon
}: ConfirmDashCardRowProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const confirming = secondsLeft > 0;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function reset() {
    clearTimeout(timerRef.current!);
    clearInterval(intervalRef.current!);
    setSecondsLeft(0);
  }

  function handleClick() {
    if (!confirming) {
      const secs = Math.ceil(timeoutMs / 1000);
      setSecondsLeft(secs);

      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(intervalRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(reset, timeoutMs);
    } else {
      reset();
      onClick();
    }
  }

  return (
    <DashCardRow
      label={label}
      icon={icon}
      description={confirming ? "Are you sure?" : description}
      actionLabel={confirming ? `${confirmLabel} (${secondsLeft}s)` : variant === "destructive" ? "" : actionLabel}
      onClick={handleClick}
      variant={variant}
      disabled={disabled}
    />
  );
}