import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      icon={undefined}
      size="icon"
      title="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      data-testid="theme-toggle"
    >
      <span className="relative h-5 w-5">
        <Sun className="absolute top-1/2 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 dark:hidden" />
        <Moon className="absolute top-1/2 left-1/2 hidden h-5 w-5 -translate-x-1/2 -translate-y-1/2 dark:block" />
      </span>
    </Button>
  )
}
