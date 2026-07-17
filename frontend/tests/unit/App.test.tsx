import type { ReactNode } from "react";

vi.mock("@/features/startup/components/AppVersionRecovery", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { shouldEnableReactQueryDevtools } from "@/App";

describe("shouldEnableReactQueryDevtools", () => {
  it("enables devtools in dev and test environments only", () => {
    expect(shouldEnableReactQueryDevtools({ DEV: true, MODE: "development" })).toBe(true);
    expect(shouldEnableReactQueryDevtools({ DEV: false, MODE: "test" })).toBe(true);
    expect(shouldEnableReactQueryDevtools({ DEV: false, MODE: "production" })).toBe(false);
  });
});
