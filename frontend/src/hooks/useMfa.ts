import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useAuth } from '@/hooks/useAuth';
import type { MfaSetupResponse } from '@/types/dto/MfaResponses';
import { authApi } from '@/api/api';

export function useMfa() {
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, fetchMfaStatus, changeUserIsMfaEnabled } = useAuth();

  const accessToken = user?.accessToken;

  const setupMfa = async (): Promise<boolean> => {
    if (!accessToken) {
      enqueueSnackbar('Please login first', { variant: 'error' });
      return false;
    }

    setIsLoading(true);
    try {
      const response = await authApi.post('mfa/setup');

      if (response.status === 200) {
        setSetupData(response.data as MfaSetupResponse);
        enqueueSnackbar('MFA setup initiated', { variant: 'success' });
        return true;
      }

      enqueueSnackbar('Failed to setup MFA', { variant: 'error' });
      return false;
    } catch {
      enqueueSnackbar('An unexpected error occurred', { variant: 'error' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (code: string): Promise<boolean> => {
    if (!accessToken || !code) return false;

    setIsLoading(true);
    try {
      const response = await authApi.post('mfa/verify', { code });

      if (response.status === 200) {
        enqueueSnackbar('MFA enabled successfully!', { variant: 'success' });
        changeUserIsMfaEnabled(true);
        await fetchMfaStatus();
        return true;
      }

      enqueueSnackbar('Invalid verification code', { variant: 'error' });
      return false;
    } catch {
      enqueueSnackbar('An unexpected error occurred', { variant: 'error' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    setupData,
    isLoading,
    accessToken,
    setupMfa,
    verifyMfa,
  };
}
