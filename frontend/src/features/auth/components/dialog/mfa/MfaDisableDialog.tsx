import { useState } from "react";
import { Shield } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import AuthDialogHeader from "../AuthDialogHeader";
import MfaCodeInput from "../../MfaCodeInput";

interface MfaDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function MfaDisableDialog({
  open,
  onOpenChange,
}: MfaDisableDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const { disableMfa } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDisableMfa = async () => {
    setIsLoading(true);
    await disableMfa(verificationCode);
    setVerificationCode("");
    onOpenChange(false);
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-dialog-md">
        <AuthDialogHeader
          icon={Shield}
          title="Disable Two-Factor Authentication"
          description="Enter your verification code"
        />
        <div className="space-y-4">
          <MfaCodeInput
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            isLoading={isLoading}
          />

          <Button
            icon={undefined}
            onClick={handleDisableMfa}
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full"
            type="button"
          >
            Verify & Disable
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
