import { useServices, type HealthStatus } from "@/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";
import Page from "@/components/layout/section/Page.tsx";
import {HeartPulse, RefreshCwIcon} from "lucide-react";
import {Button} from "@/components/ui";

const statusBorder: Record<HealthStatus, string> = {
    UP: "border-l-emerald-500",
    DOWN: "border-l-red-500",
    CHECKING: "border-l-yellow-400",
};

const statusDot: Record<HealthStatus, string> = {
    UP: "bg-emerald-500",
    DOWN: "bg-red-500",
    CHECKING: "bg-yellow-400",
};

function StatusDot({ status }: { status: HealthStatus }) {
    return (
        <span
            className={`block h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[status]}${
                status === "CHECKING" ? " animate-pulse" : ""
            }`}
        />
    );
}

export default function HealthPage() {
    const services = useServices();
    const queryClient = useQueryClient();

    function refresh() {
        queryClient.invalidateQueries({ queryKey: ["service-status"] });
    }

    function getHealthStatus() {
        // if all services are up return all good, otherwise mixed, or all down
        const allUp = services.every((svc) => svc.health === "UP");
        const allDown = services.every((svc) => svc.health === "DOWN");
        if (allUp) return "All services are operational.";
        if (allDown) return "All services are down.";
        return "Some services are experiencing issues.";
    }

    return (
        <Page title="Service Health" subtitle={getHealthStatus()} icon={HeartPulse}>
            <div className="border border-border divide-y divide-border">
                {services.map((svc) => (
                    <div
                        key={svc.id}
                        className={`flex items-center justify-between border-l-2 ${statusBorder[svc.health]} px-3 py-2 transition-colors hover:bg-muted`}
                    >
                        <div className="flex items-center gap-2">
                            <StatusDot status={svc.health} />
                            <span className="text-xs font-medium uppercase tracking-widest text-foreground">
                                {svc.label}
                            </span>
                        </div>
                        {svc.version && (
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                v{svc.version}
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <Button
                icon={RefreshCwIcon}
                onClick={refresh}
                className="mt-2 self-end text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
                Refresh
            </Button>
        </Page>
    );
}