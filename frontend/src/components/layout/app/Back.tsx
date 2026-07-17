import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Back() {
  const navigate = useNavigate();
  const location = useLocation();

  const buildSplitQuery = (search: string, fallbackTab: "overview" | "your-programme" | "block" | "all-programmes") => {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    const safeTab =
      tab === "overview" || tab === "your-programme" || tab === "block" || tab === "all-programmes"
        ? tab
        : fallbackTab;
    const next = new URLSearchParams();
    next.set("tab", safeTab);

    const programmeId = params.get("programmeId");
    if (programmeId && safeTab === "your-programme") {
      next.set("programmeId", programmeId);
    }

    const blockId = params.get("blockId");
    if (blockId && safeTab === "block") {
      next.set("blockId", blockId);
    }

    return `?${next.toString()}`;
  };

  const handleBack = () => {
    const { pathname, search } = location;

    if (pathname.match(/^\/workout\/[^/]+\/entry\/[^/]+\/edit$/)) {
      const workoutId = pathname.split('/')[2];
      return navigate(`/workout/${workoutId}/entries`);
    }

    if (pathname.match(/^\/workout\/[^/]+\/(create|edit|entries)$/)) {
      const workoutId = pathname.split('/')[2];
      return navigate(`/workout/${workoutId}`);
    }

    if (pathname.match(/^\/workout\/[^/]+$/)) {
      return navigate('/workouts');
    }

    if (pathname === '/workout/create') {
      return navigate('/workouts');
    }

    if (pathname.match(/^\/periodisation\/splits\/[^/]+\/edit$/)) {
      const splitId = pathname.split('/')[3];
      const query = buildSplitQuery(search, "overview");
      return navigate(`/periodisation/splits/${splitId}${query}`);
    }

    if (pathname.match(/^\/periodisation\/splits\/[^/]+\/programme\/custom$/)) {
      const splitId = pathname.split('/')[3];
      return navigate(`/periodisation/splits/${splitId}?tab=all-programmes`);
    }

    if (pathname.match(/^\/periodisation\/splits\/[^/]+\/programme\/setup$/)) {
      const splitId = pathname.split('/')[3];
      return navigate(`/periodisation/splits/${splitId}?tab=all-programmes`);
    }

    if (pathname.match(/^\/periodisation\/splits\/[^/]+$/)) {
      return navigate('/periodisation?tab=splits');
    }

    const staticRoutes: Record<string, string> = {
      '/splits/create': '/periodisation?tab=splits',
      '/settings':      '/user',
      '/user':          '/dashboard',
      '/terms':         '/',
      '/privacy':       '/',
    };

    const dest = staticRoutes[pathname];
    if (dest) return navigate(dest);

    if (window.history.length > 1) {
      return navigate(-1);
    }

    navigate('/dashboard');
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
      data-testid="back-button"
      className="flex h-10 w-full cursor-pointer items-center justify-start text-left transition-colors hover:bg-muted/50"
    >
      <ArrowLeft className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
