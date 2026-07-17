import { render, screen } from "@testing-library/react";
import { Shield } from "lucide-react";

import AuthDialogHeader from "@/features/auth/components/dialog/AuthDialogHeader";
import { Dialog, DialogContent } from "@/components/ui/dialog";

describe("AuthDialogHeader", () => {
  it("renders the icon, title, and description", () => {
    render(
      <Dialog open>
        <DialogContent>
          <AuthDialogHeader
            icon={Shield}
            title="Enable Two-Factor Authentication"
            description="Secure your account with an authenticator app."
          />
        </DialogContent>
      </Dialog>,
    );

    expect(
      screen.getByText("Enable Two-Factor Authentication"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Secure your account with an authenticator app."),
    ).toBeInTheDocument();
    expect(document.querySelector("svg.auth-dialog-title-icon")).toBeInTheDocument();
  });
});
