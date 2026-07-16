import { useQuery } from "@tanstack/react-query";
import { gatewayApi, unwrapApiResponse } from "@/api/api";

export type HealthStatus = "UP" | "DOWN" | "CHECKING";

interface ServiceStatus {
  id: string;
  label: string;
  version: string | undefined;
  name: string | undefined;
  buildTime: string | undefined;
  health: HealthStatus;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

type ServiceStatusItem = {
  id: string;
  label: string;
  health: "UP" | "DOWN";
  version?: string | null;
  name?: string | null;
  buildTime?: string | null;
};

type ServiceStatusResponse = {
  services: ServiceStatusItem[];
};

const SERVICES = [
  { id: "auth", label: "Auth Service" },
  { id: "workout", label: "Workout Service" },
  { id: "gateway", label: "Gateway" },
  { id: "frontend", label: "Frontend" },
] as const;

function normalizeVersion(version?: string | null) {
  if (!version || version === "unknown") {
    return undefined;
  }
  return version.split("-")[0];
}

function isServiceStatusResponse(value: unknown): value is ServiceStatusResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const services = (value as { services?: unknown }).services;
  return Array.isArray(services);
}

export function useServices(): ServiceStatus[] {
  const statusQuery = useQuery({
    queryKey: ["service-status"],
    queryFn: async () => {
      const data = unwrapApiResponse(await gatewayApi.get<unknown>("service-status"));

      if (!isServiceStatusResponse(data)) {
        throw new Error("Service status response was not valid");
      }

      return data;
    },
    retry: 1,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return SERVICES.map((svc) => {
    const service = statusQuery.data?.services.find((item) => item.id === svc.id);
    const health = statusQuery.isLoading
      ? "CHECKING"
      : statusQuery.isError || service?.health !== "UP"
        ? "DOWN"
        : "UP";
    const version = svc.id === "frontend"
      ? (__APP_VERSION__ === "unknown" ? undefined : __APP_VERSION__)
      : normalizeVersion(service?.version);

    return {
      id: svc.id,
      label: service?.label ?? svc.label,
      version,
      name: service?.name ?? undefined,
      buildTime: service?.buildTime ?? undefined,
      health,
      isLoading: statusQuery.isLoading,
      isError: statusQuery.isError,
      error: statusQuery.error instanceof Error ? statusQuery.error : null,
    };
  });
}
