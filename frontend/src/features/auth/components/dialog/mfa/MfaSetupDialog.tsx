import { useState } from "react";
import { Shield, Copy, Check, Download } from "lucide-react";
import { enqueueSnackbar } from "notistack";

import { useMfa } from "@/features/auth/hooks/useMfa";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import AuthDialogHeader from "../AuthDialogHeader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MfaCodeInput from "../../MfaCodeInput";

interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export default function MfaSetupDialog({
  open,
  onOpenChange,
  onComplete,
}: MfaSetupDialogProps) {
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [verificationCode, setVerificationCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const { setupData, isLoading, accessToken, setupMfa, verifyMfa } = useMfa();

  const handleSetupMfa = async () => {
    const ok = await setupMfa();
    if (ok) setStep("verify");
  };

  const handleVerifyCode = async () => {
    const ok = await verifyMfa(verificationCode);
    if (ok) {
      setStep("backup");
    } else {
      setVerificationCode("");
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      enqueueSnackbar("Secret copied to clipboard", { variant: "success" });
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    const content = `Dedicate Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${setupData.backupCodes.join("\n")}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dedicate-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    enqueueSnackbar("Backup codes downloaded", { variant: "success" });
  };

  const handleComplete = () => {
    onOpenChange(false);
    setStep("setup");
    setVerificationCode("");
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-dialog-md">
        <AuthDialogHeader
          icon={Shield}
          title="Enable Two-Factor Authentication"
          description={
            step === "setup"
              ? "Secure your account with an authenticator app"
              : step === "verify"
                ? "Scan the QR code and enter your verification code"
                : "Save your backup codes in a secure location"
          }
        />

        {step === "setup" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you'll need</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• An authenticator app (Google Authenticator, Authy, etc.)</p>
                <p>• Your phone or tablet</p>
                <p>• A secure place to store backup codes</p>
              </CardContent>
            </Card>

            <Button
              icon={undefined}
              onClick={handleSetupMfa}
              disabled={isLoading || !accessToken}
              className="w-full"
              type="button"
              data-testid="mfa-setup-continue"
            >
              {isLoading ? "Setting up..." : "Continue"}
            </Button>

            {!accessToken && (
              <p className="text-xs text-red-500 text-center">
                No access token available
              </p>
            )}
          </div>
        )}

        {step === "verify" && setupData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan QR Code</CardTitle>
                <CardDescription>
                  Open your authenticator app and scan this code
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <img
                  src={setupData.qrCode}
                  alt="QR Code"
                  className="w-48 h-48 border rounded-lg"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Or enter manually</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    icon={undefined}
                    size="icon"
                    onClick={handleCopySecret}
                    type="button"
                    aria-label={secretCopied ? "Secret copied" : "Copy secret"}
                    data-testid="mfa-copy-secret"
                  >
                    {secretCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <MfaCodeInput
              verificationCode={verificationCode}
              setVerificationCode={setVerificationCode}
              isLoading={isLoading}
            />

            <Button
              icon={undefined}
              onClick={handleVerifyCode}
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full"
              type="button"
              data-testid="mfa-verify-enable"
            >
              {isLoading ? "Verifying..." : "Verify & Enable"}
            </Button>
          </div>
        )}

        {step === "backup" && setupData && (
          <div className="space-y-4">
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardHeader>
                <CardTitle className="text-base text-yellow-600 dark:text-yellow-500">
                  Important: Save Your Backup Codes
                </CardTitle>
                <CardDescription>
                  These codes can be used to access your account if you lose your
                  authenticator device
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="justify-center py-2 font-mono"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                icon={undefined}
                onClick={handleDownloadBackupCodes}
                className="flex-1"
                type="button"
                data-testid="mfa-download-backup-codes"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button icon={undefined} onClick={handleComplete} className="flex-1" type="button">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
