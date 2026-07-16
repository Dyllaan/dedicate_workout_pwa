import { Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MfaCodeInput from "@/components/auth/MfaCodeInput";
import { enqueueSnackbar } from 'notistack';
import Page from "@/components/layout/section/Page.tsx";
import {PasswordInput} from "@/components/layout/input/BaseInput.tsx";

export default function ChangePasswordPage() {
    const { updatePassword, user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);
    const [showMfaInput, setShowMfaInput] = useState(false);

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            enqueueSnackbar("New password and confirmation do not match", { variant: 'error' });
            return;
        }

        setIsLoadingPassword(true);

        try {
            const result = await updatePassword(
                currentPassword,
                newPassword,
                user?.mfaEnabled ? mfaCode : undefined
            );

            if (result.success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setMfaCode('');
                setShowMfaInput(false);
            } else if (result.mfaRequired) {
                setShowMfaInput(true);
            }
        } finally {
            setIsLoadingPassword(false);
        }
    }

    return (
        <Page
            icon={Lock}
            title="Change Password"
        >
            <form onSubmit={handlePasswordChange} className="space-y-4 pt-4">
                <div className="space-y-2">
                    <label htmlFor="current-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Current Password
                    </label>
                    <PasswordInput
                        id="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        disabled={isLoadingPassword}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        New Password
                    </label>
                    <PasswordInput
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        disabled={isLoadingPassword}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        Confirm New Password
                    </label>
                    <PasswordInput
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        disabled={isLoadingPassword}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                {user?.mfaEnabled && (
                    <MfaCodeInput verificationCode={mfaCode} setVerificationCode={setMfaCode} isLoading={isLoadingPassword} />
                )}

                {showMfaInput && !user?.mfaEnabled && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-400">
                            MFA code is required. Please enter your authentication code and try again.
                        </p>
                    </div>
                )}

                <Button
                    icon={undefined}
                    type="submit"
                    disabled={isLoadingPassword}
                    className="w-full"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoadingPassword ? 'Updating...' : 'Update Password'}
                </Button>
            </form>
        </Page>
    );
}
