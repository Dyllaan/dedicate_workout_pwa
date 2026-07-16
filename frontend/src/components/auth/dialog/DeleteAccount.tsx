import { useState } from 'react';
import { Lock } from 'lucide-react';
import ConfirmDialog from '@/components/layout/dialog/ConfirmDialog.tsx';
import RequiresMfaVerificationDialog from '@/components/auth/dialog/mfa/RequiresMfaVerificationDialog.tsx';
import type { User } from '@/types/User.ts';
import { DashCardRow } from '@/components/layout/card/DashCardRow.tsx';

export default function DeleteAccount({user, deleteUser} : {user?: User | null, deleteUser: (userCode: string) => Promise<void>}) {

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMfaEnabled = user?.mfaEnabled || false;
  const handleDeleteAccount = async (code: string) => {
    try {
        setIsDeleting(true);
        await deleteUser(code);
    } finally {
        setIsDeleting(false);
    }
  };
      

  return (
        <>
            <ConfirmDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
              title="Delete account?"
              description="This will permanently delete your account and all associated data."
              confirmLabel="Confirm"
              destructive
              isPending={isDeleting}
              onConfirm={async () => {
                setShowConfirmDialog(false);
                if (isMfaEnabled) {
                  setShowDeleteDialog(true);
                  return;
                }
                await handleDeleteAccount("");
              }}
            />
            {isMfaEnabled ? (
                <RequiresMfaVerificationDialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                    onComplete={handleDeleteAccount}
                    isLoading={false}
                />
            ) : null}
            <DashCardRow
                label="Delete Account"
                description="Permanently delete your account and all associated data."
                icon={Lock}
                onClick={() => setShowConfirmDialog(true)}
                variant="destructive"
                disabled={isDeleting}
            />
        </>
  );
}
