import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface StepperBaseProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  invalid?: boolean;
  disabled?: boolean;
}

interface StepperButtonMode extends StepperBaseProps {
  mode: "button";
}

interface StepperRowMode extends StepperBaseProps {
  mode: "row";
  label: string;
  unit?: string;
}

interface StepperInputMode extends StepperBaseProps {
  mode: "input";
  inputValue: string;
  onInputChange: (value: string) => void;
  unit?: string;
  inputId?: string;
  lastValue?: number;
  inputMode?: "numeric" | "decimal";
}

type StepperProps = StepperButtonMode | StepperRowMode | StepperInputMode;

export function StepButton({
  onClick,
  label,
  disabled,
  invalid,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      tabIndex={-1}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors",
        invalid && "border-destructive",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <span className="text-xl font-bold leading-none">{label === "decrement" ? "−" : "+"}</span>
    </button>
  );
}

export function Stepper(props: StepperProps) {
  const decrementDisabled =
    props.disabled || (props.min !== undefined && props.value !== undefined && props.value <= props.min);
  const incrementDisabled =
    props.disabled || (props.max !== undefined && props.value !== undefined && props.value >= props.max);

  if (props.mode === "button") {
    return (
      <div className="flex items-center gap-2">
        <StepButton
          label="decrement"
          onClick={props.onDecrement}
          disabled={decrementDisabled}
          invalid={props.invalid}
        />
        <StepButton
          label="increment"
          onClick={props.onIncrement}
          disabled={incrementDisabled}
          invalid={props.invalid}
        />
      </div>
    );
  }

  if (props.mode === "row") {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-between",
          props.invalid ? "text-destructive" : "text-foreground",
        )}
      >
        <span className="ui-text-eyebrow">{props.label}</span>
        <div className="flex items-center gap-2">
          <StepButton
            label="decrement"
            onClick={props.onDecrement}
            disabled={decrementDisabled}
            invalid={props.invalid}
          />
          <span
            className={cn(
              "min-w-[2rem] text-center text-sm font-semibold tabular-nums",
              props.invalid ? "text-destructive" : "text-foreground",
            )}
          >
            {props.value}
            {props.unit && (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                {props.unit}
              </span>
            )}
          </span>
          <StepButton
            label="increment"
            onClick={props.onIncrement}
            disabled={incrementDisabled}
            invalid={props.invalid}
          />
        </div>
      </div>
    );
  }

  // mode === "input"
  return (
    <div className="flex items-center gap-2">
      <StepButton
        label="decrement"
        onClick={props.onDecrement}
        disabled={decrementDisabled}
        invalid={props.invalid}
      />
      <div className="relative flex flex-1 items-center">
        <Input
          id={props.inputId}
          type="text"
          inputMode={props.inputMode ?? "numeric"}
          pattern="[0-9]*\.?[0-9]*"
          placeholder={props.lastValue != null ? String(props.lastValue) : "-"}
          value={props.inputValue}
          onChange={(e) => props.onInputChange(e.target.value)}
          className="h-10 w-full rounded-xl pl-1 pr-10 text-center text-lg font-bold"
        />
        {props.unit && <span className="ui-input-unit">{props.unit}</span>}
      </div>
      <StepButton
        label="increment"
        onClick={props.onIncrement}
        disabled={incrementDisabled}
        invalid={props.invalid}
      />
    </div>
  );
}
