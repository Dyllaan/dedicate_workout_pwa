import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useState } from 'react';
import MfaSetupDialog from '@/components/auth/dialog/mfa/MfaSetupDialog.tsx';
import MfaDisableDialog from './mfa/MfaDisableDialog.tsx';
import { DashCardRow } from '@/components/layout/card/DashCardRow.tsx';

export default function ManageMfa() {
    const { user } = useAuth();
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [showMfaDisable, setShowMfaDisable] = useState(false);
    const mfaEnabled = user?.mfaEnabled || false;

    return (
        <>
            <DashCardRow
                label={mfaEnabled ? "MFA is Enabled" : "MFA is Disabled"}
                description={mfaEnabled ? "Multi-factor authentication is currently enabled on your account." : "Please enable MFA for added security."}
                icon={Shield}
                onClick={!mfaEnabled ? () => setShowMfaSetup(true) : () => setShowMfaDisable(true)}
            />
            <MfaSetupDialog
                    open={showMfaSetup}
                    onOpenChange={setShowMfaSetup}
                    onComplete={() => setShowMfaSetup(false)}
                />

            <MfaDisableDialog
                    open={showMfaDisable}
                    onOpenChange={setShowMfaDisable}
                    onComplete={() => setShowMfaDisable(false)}
                />
        </>
    );
}
