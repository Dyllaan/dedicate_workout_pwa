import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginForm from "@/components/auth/forms/LoginForm";
import RegisterForm from "@/components/auth/forms/RegisterForm";
import MfaForm from "@/components/auth/forms/MfaForm";
import { ICONS } from "@/config/iconConfig";
import AuthRequirementsDialog from "@/components/auth/dialog/AuthRequirementsDialog";
import { HelpCircle } from "lucide-react";
import { ServiceVersions } from "@/components/health/ServiceVersions";
import { useNavigate } from "react-router-dom";
import Page from "@/components/layout/section/Page";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function AuthSwitcher({
  isLogin,
  onToggle,
}: {
  isLogin: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4 text-sm text-muted-foreground">
      <span>
        {isLogin ? "Don't have an account?" : "Already have an account?"}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
      >
        {isLogin ? "Sign up" : "Sign in"}
      </button>
    </div>
  );
}

export default function AuthPage({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  const [isLogin, setIsLogin] = useState(mode === "login");
  const { mfaRequired } = useAuth();
  const [showRequirements, setRequirements] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(mode === "login");
  }, [mode]);

  const toggleAuthMode = () => {
    navigate(isLogin ? "/register" : "/login");
  };

  if (mfaRequired) {
    return (
      <Page
        title="Verify your account"
        subtitle="Enter the code from your authenticator app to continue."
        icon={ICONS.login}
        contentClassName="space-y-6"
      >
        <div className="w-full max-w-md space-y-6">
          <MfaForm onSuccess={() => {}} />
          <ServiceVersions />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={isLogin ? "Login" : "Register"}
      subtitle={isLogin ? "Pick up where you left off." : "Create your account and start building your training flow."}
      icon={isLogin ? ICONS.login : ICONS.register}
      variant="hero"
      actions={
        <Button
          icon={undefined}
          type="button"
          size="icon"
          onClick={() => setRequirements(true)}
          aria-label="Authentication requirements"
          className="rounded-full"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      }
      contentClassName="space-y-6"
    >
      <AuthRequirementsDialog
        open={showRequirements}
        onOpenChange={setRequirements}
      />
      {isLogin ? <LoginForm /> : <RegisterForm />}
      <AuthSwitcher isLogin={isLogin} onToggle={toggleAuthMode} />
      <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <Link
          type="button"
          to="/"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </Page>
  );
}
