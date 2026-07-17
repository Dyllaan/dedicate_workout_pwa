import { useState } from 'react';
import { Shield, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Section from '@/components/layout/section/Section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MfaCodeInput from '../MfaCodeInput';

interface MfaFormProps {
  onSuccess: () => void;
}

export default function MfaForm({ onSuccess }: MfaFormProps) {
  const [mfaCode, setMfaCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { verifyMfa, logout } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await verifyMfa(mfaCode, trustDevice);
      
      if (result.success) {
        onSuccess();
      } else {
        setMfaCode('');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Section 
      icon={Shield} 
      title="Two-Factor Authentication" 
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verifyCode" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Authentication Code
          </Label>
          <MfaCodeInput verificationCode={mfaCode} setVerificationCode={setMfaCode} isLoading={isLoading} />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox 
            id="trustDevice" 
            checked={trustDevice}
            onCheckedChange={(checked: boolean) => setTrustDevice(checked as boolean)}
            disabled={isLoading}
          />
          <label
            htmlFor="trustDevice"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Trust this device for 30 days
          </label>
        </div>

        <Button
          icon={undefined}
          type="submit"
          disabled={isLoading || mfaCode.length < 6}
          className="w-full mt-6"
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>

        <Button
          icon={undefined}
          type="button"
          onClick={logout}
          disabled={isLoading}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>

        <Card className="bg-muted/50 border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Need help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Enter your 6-digit TOTP code from your authenticator app</p>
            <p>• Or use one of your 8-digit backup codes</p>
            <p>• Codes refresh every 30 seconds</p>
          </CardContent>
        </Card>
      </form>
    </Section>
  );
}
