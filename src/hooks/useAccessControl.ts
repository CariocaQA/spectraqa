import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccessStatus {
  canAccess: boolean;
  isBlocked: boolean;
  isTrialExpired: boolean;
  trialExpiresAt: Date | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAccessControl(): AccessStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<AccessStatus>({
    canAccess: true,
    isBlocked: false,
    isTrialExpired: false,
    trialExpiresAt: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setStatus({
          canAccess: false,
          isBlocked: false,
          isTrialExpired: false,
          trialExpiresAt: null,
          isAdmin: false,
          loading: false,
        });
        return;
      }

      try {
        // Check if user is admin first
        const { data: isAdminData } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });

        const isAdmin = isAdminData === true;

        // Check user access status
        const { data: accessData, error } = await supabase
          .rpc('check_user_access', { _user_id: user.id });

        if (error) {
          console.error('Error checking access:', error);
          // Default to allowing access if there's an error
          setStatus({
            canAccess: true,
            isBlocked: false,
            isTrialExpired: false,
            trialExpiresAt: null,
            isAdmin,
            loading: false,
          });
          return;
        }

        const accessRow = accessData?.[0];

        setStatus({
          canAccess: accessRow?.can_access ?? true,
          isBlocked: accessRow?.is_blocked ?? false,
          isTrialExpired: accessRow?.is_trial_expired ?? false,
          trialExpiresAt: accessRow?.trial_expires_at 
            ? new Date(accessRow.trial_expires_at) 
            : null,
          isAdmin,
          loading: false,
        });
      } catch (err) {
        console.error('Error checking access:', err);
        setStatus({
          canAccess: true,
          isBlocked: false,
          isTrialExpired: false,
          trialExpiresAt: null,
          isAdmin: false,
          loading: false,
        });
      }
    }

    checkAccess();
  }, [user]);

  return status;
}
