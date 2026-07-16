import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "@/components/auth/forms/LoginForm";
import RegisterForm from "@/components/auth/forms/RegisterForm";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("auth forms", () => {
  it("submits the login form with the entered credentials", async () => {
    const login = vi.fn(async () => ({ success: true }));

    renderWithProviders(<LoginForm />, {
      auth: createAuthContextValue({ login }),
    });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "louis" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/), {
      target: { value: "Password1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith("louis", "Password1"),
    );
  });

  it("keeps the login password toggle keyboard-accessible without breaking the field selector", async () => {
    const user = userEvent.setup();

    renderWithProviders(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^Password$/);

    await user.type(passwordInput, "Password1");
    expect(passwordInput).toHaveValue("Password1");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.tab();

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-controls", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.keyboard("[Enter]");

    expect(screen.getByLabelText(/^Password$/)).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("blocks invalid registration and submits valid registration details", async () => {
    const register = vi.fn(async () => ({ success: true }));

    renderWithProviders(<RegisterForm />, {
      auth: createAuthContextValue({ register }),
    });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "ab" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "Password2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account", hidden: true }));

    await waitFor(() => {
      expect(screen.getByText("Username must be at least 3 characters")).toBeInTheDocument();
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(register).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "louis_user" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account", hidden: true }));

    await waitFor(() =>
      expect(
        screen.getByText("You must agree to the Terms of Service and Privacy Policy"),
      ).toBeInTheDocument(),
    );
    expect(register).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("checkbox", { hidden: true })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Create Account", hidden: true }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("louis_user", "Password1"),
    );
  });
});
