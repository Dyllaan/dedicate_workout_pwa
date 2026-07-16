import { useState } from "react";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import AuthDialogHeader from "../AuthDialogHeader";
import MfaCodeInput from "../../MfaCodeInput";

interface RequiresMfaVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (code: string) => void;
  isLoading: boolean;
}

export default function RequiresMfaVerificationDialog({
  open,
  onOpenChange,
  onComplete,
  isLoading,
}: RequiresMfaVerificationDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <AuthDialogHeader
          icon={Shield}
          title="Multi-Factor Authentication Required"
          description="To proceed, please enter the verification code from your authenticator app."
        />
        <div className="mt-4 space-y-4">
          <MfaCodeInput
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            isLoading={isLoading}
          />

          <Button
            icon={undefined}
            onClick={() => onComplete(verificationCode)}
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full bg-destructive hover:bg-destructive/90"
            type="button"
          >
            {isLoading ? "Verifying..." : "Verify & Delete Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
