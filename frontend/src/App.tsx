import "./App.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from './AppRoutes';
import AuthProvider from '@/features/auth/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from "react";
import StorageNotice from "@/components/layout/app/StorageNotice";
import AppVersionRecovery from "@/features/startup/components/AppVersionRecovery";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

export function shouldEnableReactQueryDevtools(environment: {
  DEV?: boolean;
  MODE?: string;
}) {
  return Boolean(environment.DEV || environment.MODE === "test");
}

export default function App() {
  const showReactQueryDevtools = shouldEnableReactQueryDevtools(import.meta.env);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppVersionRecovery>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AppRoutes />
              <StorageNotice />
            </ThemeProvider>
          </AuthProvider>
        </AppVersionRecovery>
      </BrowserRouter>
      {showReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}
