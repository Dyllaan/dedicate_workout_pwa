import { useServices, type HealthStatus } from "@/features/health/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";

const statusClass: Record<HealthStatus, string> = {
  UP: "bg-emerald-500",
  DOWN: "bg-red-500",
  CHECKING: "bg-yellow-400",
};

function StatusDot({ status }: { status: HealthStatus }) {
  return (
    <span className={`block h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${statusClass[status]}`} />
  );
}

const cardBase =
  "group relative border border-border bg-card px-2.5 py-1.5 transition-colors hover:bg-muted";

const accent =
  "absolute bottom-0 left-0 h-px w-full bg-border transition-colors group-hover:bg-primary";

export function ServiceVersions() {
  const services = useServices();
  const queryClient = useQueryClient();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["service-status"] });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 px-2 py-1">
      {services.map((svc) => (
        <div key={svc.id} className={cardBase}>
          <div className="flex items-center gap-1.5">
            <StatusDot status={svc.health} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground">
              {svc.label}
            </span>
            {svc.version && (
              <span className="font-mono text-[10px] text-muted-foreground">
                v{svc.version}
              </span>
            )}
          </div>
          <span className={accent} />
        </div>
      ))}
      <button onClick={refresh} className={`${cardBase} text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground`}>
        Refresh
        <span className={accent} />
      </button>
    </div>
  );
}
