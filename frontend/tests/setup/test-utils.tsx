import type { ReactElement } from "react";
import { SnackbarProvider } from "notistack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthContext, type AuthContextType } from "@/components/auth/auth";
import { ThemeProvider } from "@/components/theme/theme-provider";
import type { LoginResult } from "@/types/User";
import { buildUser } from "../shared/builders";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createAuthContextValue(
  overrides: Partial<AuthContextType> = {},
): AuthContextType {
  const defaultResult = Promise.resolve({ success: true } satisfies LoginResult);

  return {
    user: buildUser(),
    setUser: vi.fn(),
    login: vi.fn(() => defaultResult),
    verifyMfa: vi.fn(() => defaultResult),
    logout: vi.fn(),
    signedIn: true,
    mfaRequired: false,
    pendingMfaToken: null,
    mfaStatus: null,
    fetchMfaStatus: vi.fn(async () => {}),
    deleteUser: vi.fn(async () => {}),
    disableMfa: vi.fn(async () => ({ success: true })),
    changeUserIsMfaEnabled: vi.fn(),
    updatePassword: vi.fn(async () => ({ success: true })),
    isLoading: false,
    register: vi.fn(() => defaultResult),
    ...overrides,
  };
}

type ProviderOptions = {
  route?: string;
  auth?: AuthContextType;
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const {
    route = "/",
    auth = createAuthContextValue(),
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  return {
    queryClient,
    auth,
    ...render(ui, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={auth}>
              <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
                <SnackbarProvider>{children}</SnackbarProvider>
              </ThemeProvider>
            </AuthContext.Provider>
          </MemoryRouter>
        </QueryClientProvider>
      ),
      ...renderOptions,
    }),
  };
}
