import { fireEvent, screen } from "@testing-library/react";
import MfaCodeInput from "@/features/auth/components/MfaCodeInput";
import { renderWithProviders } from "tests/setup/test-utils";

describe("MfaCodeInput", () => {
  it("strips non-digit characters from the verification code", () => {
    const setVerificationCode = vi.fn();

    renderWithProviders(
      <MfaCodeInput
        verificationCode=""
        setVerificationCode={setVerificationCode}
        isLoading={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Enter 6-digit code from Authenticator"), {
      target: { value: "12a34!" },
    });

    expect(setVerificationCode).toHaveBeenCalledWith("1234");
  });
});
