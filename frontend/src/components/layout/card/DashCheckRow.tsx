import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashCheckRowProps = {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  datetime?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function DashCheckRow({
  icon: Icon,
  label,
  description,
  datetime,
  checked,
  onChange,
  disabled = false,
  className,
  children,
}: DashCheckRowProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && !disabled) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const sharedClassName =
    `${className || ""} flex mx-auto items-center justify-between gap-3 py-1 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`;

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`w-full text-left ${sharedClassName}`}
        disabled={disabled}
        type="button"
        role="checkbox"
        aria-checked={checked}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`ml-2 p-2 rounded-lg ${checked ? "bg-primary/10" : "bg-muted/50"}`}>
            <Icon className={`h-3 w-3 ${checked ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${checked ? "text-primary" : "text-foreground"}`}>
              {label}
            </p>
            <div className="flex gap-2 items-center">
              {description && (
                <p className="text-xxs text-muted-foreground">{description}</p>
              )}
              {datetime && (
                <p className="text-xxs text-muted-foreground">{datetime}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mr-2">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                checked
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 bg-transparent"
            }`}>
                {checked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
        </div>
      </button>
      {children && <div className="w-full">{children}</div>}
    </div>
  );
}