import { Link, useLocation } from "react-router-dom";
import { House } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ICONS } from "@/config/iconConfig";

const tabs = [
    {
        label: "Home",
        to: "/dashboard",
        icon: House,
        isActive: (pathname: string) => pathname === "/dashboard",
    },
    {
        label: "Workouts",
        to: "/workouts",
        icon: ICONS.workout,
        isActive: (pathname: string) =>
            pathname.startsWith("/workout") || pathname === "/workouts",
    },
    {
        label: "Insights",
        to: "/insights",
        icon: ICONS.progress,
        isActive: (pathname: string) =>
            pathname === "/insights" || pathname.startsWith("/insights/"),
    },
    {
        label: "Periodisation",
        to: "/periodisation",
        icon: ICONS.programme,
        isActive: (pathname: string) => pathname.startsWith("/periodisation"),
    },
    {
        label: "You",
        to: "/you",
        icon: ICONS.login,
        isActive: (pathname: string) => pathname === "/you",
    }
];

const HIDDEN_ROUTES = ["/login", "/register"];

export default function BottomNav({ forceVisible = false }: { forceVisible?: boolean }) {
    const { signedIn } = useAuth();
    const { pathname } = useLocation();

    if (HIDDEN_ROUTES.includes(pathname)) return null;
    if (!signedIn && !forceVisible) return null;

    return (
        <nav
            aria-label="Primary navigation"
            data-testid="bottom-nav"
            className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
        >
            <div
                className="mx-auto flex w-full max-w-lg pb-[max(env(safe-area-inset-bottom,0px),12px)]"
            >
                {tabs.map((tab) => {
                    const active = tab.isActive(pathname);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center gap-1 pt-3 pb-2 min-h-[68px] transition-colors select-none",
                                active
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon
                                className="h-6 w-6"
                                strokeWidth={active ? 2.5 : 1.5}
                            />
                            <span className="text-[11px] font-medium tracking-wide">
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
