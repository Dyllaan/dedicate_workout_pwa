import { fireEvent, screen } from "@testing-library/react";
import StorageNotice, {
  STORAGE_NOTICE_ACK_KEY,
} from "@/components/layout/StorageNotice";
import { createAuthContextValue, renderWithProviders } from "tests/setup/test-utils";

describe("StorageNotice", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows on first render with policy links", () => {
    renderWithProviders(<StorageNotice />, {
      route: "/login",
      auth: createAuthContextValue({ signedIn: false, user: null }),
    });

    expect(screen.getByRole("heading", { name: "Essential cookies and storage only" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  });

  it("hides after acknowledgement and persists the choice", () => {
    renderWithProviders(<StorageNotice />, {
      route: "/login",
      auth: createAuthContextValue({ signedIn: false, user: null }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));

    expect(screen.queryByRole("heading", { name: "Essential cookies and storage only" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_NOTICE_ACK_KEY)).toBe("acknowledged");
  });

  it("stays hidden when the notice was already acknowledged", () => {
    window.localStorage.setItem(STORAGE_NOTICE_ACK_KEY, "acknowledged");

    renderWithProviders(<StorageNotice />, {
      route: "/dashboard",
      auth: createAuthContextValue(),
    });

    expect(screen.queryByRole("heading", { name: "Essential cookies and storage only" })).not.toBeInTheDocument();
  });
});
