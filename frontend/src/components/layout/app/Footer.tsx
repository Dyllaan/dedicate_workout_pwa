import {Link} from "react-router-dom";

const gitHubUrl = import.meta.env.VITE_GITHUB_URL || 'https://github.com';
export default function Footer() {
    return (
        <footer className="text-center text-xs text-muted-foreground space-y-1.5 pb-4">
            <p>Open source · Self-hostable</p>
            <p className="flex items-center justify-center gap-3">
            <Link to={gitHubUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground transition-colors">
                GitHub
            </Link>
            <Link to="/terms" className="underline hover:text-foreground transition-colors">
                Terms of Service
            </Link>
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
            </Link>
                <Link to="/health" className="underline hover:text-foreground transition-colors">Service Health</Link>
          </p>
        </footer>
    );
}