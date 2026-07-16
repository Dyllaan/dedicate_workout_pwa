import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper, StepButton } from "@/components/ui/stepper";

describe("Stepper â€” button mode", () => {
  it("renders decrement and increment buttons", () => {
    render(
      <Stepper
        mode="button"
        value={5}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /decrement/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /increment/i })).toBeInTheDocument();
  });

  it("disables decrement when value equals min", () => {
    render(
      <Stepper
        mode="button"
        value={0}
        min={0}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /decrement/i })).toBeDisabled();
  });

  it("calls onDecrement when decrement is pressed", async () => {
    const onDecrement = vi.fn();
    render(
      <Stepper
        mode="button"
        value={3}
        onDecrement={onDecrement}
        onIncrement={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /decrement/i }));
    expect(onDecrement).toHaveBeenCalledOnce();
  });
});

describe("Stepper â€” row mode", () => {
  it("renders label and value", () => {
    render(
      <Stepper
        mode="row"
        label="Sets"
        value={3}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />
    );
    expect(screen.getByText("Sets")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("Stepper â€” input mode", () => {
  it("defaults to a numeric mobile keyboard", () => {
    render(
      <Stepper
        mode="input"
        value={5}
        inputValue="5"
        onInputChange={vi.fn()}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "numeric");
  });

  it("can use a decimal mobile keyboard", () => {
    render(
      <Stepper
        mode="input"
        value={5}
        inputMode="decimal"
        inputValue="5.5"
        onInputChange={vi.fn()}
        onDecrement={vi.fn()}
        onIncrement={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "decimal");
  });
});

describe("StepButton", () => {
  it("renders as a button with aria-label", () => {
    render(<StepButton onClick={vi.fn()} label="decrement" />);
    expect(screen.getByRole("button", { name: /decrement/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<StepButton onClick={onClick} label="increment" />);
    await userEvent.click(screen.getByRole("button", { name: /increment/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
