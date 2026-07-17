import LoadingState from "@/components/layout/feedback/LoadingState";

export default function RouteLoadingPage() {
  return (
    <div className="px-4 py-4" data-testid="route-loading" aria-live="polite">
      <LoadingState rows={1} className="pt-0" />
    </div>
  );
}
