import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminActivityLogEntry } from '../../shared/types/furli';
import { nowLabel } from '../../shared/utils/furli';
import { createAdminSeedData, type AdminSeedData } from './mockData';
import { getAdminActivity, getAdminProviders, mapAdminProviderDto } from './api';
import type {
  AdminFeatureFlag,
  AdminGdprRequest,
  AdminIntegrationRecord,
  AdminProviderRecord,
  AdminReferralCode,
  AdminReviewRecord,
} from './model';

const STORAGE_KEY = 'furli_admin_v1';

interface AdminContextValue extends AdminSeedData {
  pendingVerificationCount: number;
  accessToken: string;
  activity: AdminActivityLogEntry[];
  refreshActivity: () => Promise<void>;
  getProvider: (providerId: string) => AdminProviderRecord | null;
  mergeProviders: (providers: AdminProviderRecord[]) => void;
  refreshProviders: () => Promise<void>;
  refreshPendingVerificationCount: () => Promise<void>;
  logAudit: (action: string, target: string) => void;
  moderateReview: (reviewId: string, nextStatus: AdminReviewRecord['status']) => void;
  resolveReport: (reportId: string) => void;
  setIntegrationStatus: (integrationId: string, status: AdminIntegrationRecord['status']) => void;
  addBroadcast: (title: string) => void;
  addReferralCode: () => void;
  toggleFeatureFlag: (flagId: string) => void;
  resolveGdprRequest: (requestId: string) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function loadAdminState(): AdminSeedData {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      return createAdminSeedData();
    }
    return JSON.parse(raw) as AdminSeedData;
  } catch {
    return createAdminSeedData();
  }
}

function pushAudit(action: string, target: string, auditTrail: AdminSeedData['audit']) {
  return [
    {
      id: `audit_${Date.now().toString(36)}`,
      action,
      target,
      actor: 'admin@furli.pl',
      timestamp: nowLabel(),
    },
    ...auditTrail,
  ];
}

export function AdminStateProvider({ accessToken, children }: { accessToken: string; children: ReactNode }) {
  const [state, setState] = useState<AdminSeedData>(() => loadAdminState());
  const [remotePendingCount, setRemotePendingCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<AdminActivityLogEntry[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // no-op
    }
  }, [state]);

  const mergeProviders = useCallback((providers: AdminProviderRecord[]) => {
    setState((current) => ({
      ...current,
      providers: [
        ...providers,
        ...current.providers.filter((provider) => !providers.some((item) => item.id === provider.id)),
      ],
    }));
  }, []);

  const refreshProviders = useCallback(async () => {
    const remoteProviders = await getAdminProviders(accessToken);
    setState((current) => {
      const mappedProviders = remoteProviders.map((provider) => mapAdminProviderDto(provider, current.providers.find((item) => item.id === provider.id)));
      return {
        ...current,
        providers: mappedProviders,
      };
    });
  }, [accessToken]);

  const refreshPendingVerificationCount = useCallback(async () => {
    try {
      // Both "pending" and "changes_requested" accounts are awaiting an admin decision (per the
      // mockup) — the backend only filters on a single status value, so fetch the full list and
      // filter client-side rather than undercounting "changes_requested" accounts.
      const allProviders = await getAdminProviders(accessToken);
      const pendingProviders = allProviders.filter((provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested');
      setRemotePendingCount(pendingProviders.length);
      setState((current) => {
        const mappedProviders = pendingProviders.map((provider) => mapAdminProviderDto(provider, current.providers.find((item) => item.id === provider.id)));
        return {
          ...current,
          providers: [
            ...mappedProviders,
            ...current.providers.filter((provider) => !mappedProviders.some((item) => item.id === provider.id)),
          ],
        };
      });
    } catch {
      setRemotePendingCount(null);
    }
  }, [accessToken]);

  const refreshActivity = useCallback(async () => {
    try {
      const entries = await getAdminActivity(accessToken);
      setActivity(entries);
    } catch {
      // keep the last known activity feed on transient failure
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshProviders().catch(() => undefined);
  }, [refreshProviders]);

  useEffect(() => {
    void refreshPendingVerificationCount();
  }, [refreshPendingVerificationCount]);

  useEffect(() => {
    void refreshActivity();
  }, [refreshActivity]);

  const logAudit = useCallback((action: string, target: string) => {
    setState((current) => ({
      ...current,
      audit: pushAudit(action, target, current.audit),
    }));
  }, []);

  const value = useMemo<AdminContextValue>(() => ({
    ...state,
    accessToken,
    activity,
    refreshActivity,
    pendingVerificationCount: remotePendingCount ?? state.providers.filter((provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested').length,
    getProvider: (providerId: string) => state.providers.find((provider) => provider.id === providerId) || null,
    mergeProviders,
    refreshProviders,
    refreshPendingVerificationCount,
    logAudit,
    moderateReview: (reviewId, nextStatus) => {
      setState((current) => {
        const review = current.reviews.find((item) => item.id === reviewId);
        if (!review) {
          return current;
        }
        return {
          ...current,
          reviews: current.reviews.map((item) => item.id === reviewId ? { ...item, status: nextStatus } : item),
          audit: pushAudit(`Zmieniono status opinii na ${nextStatus}`, review.providerName, current.audit),
        };
      });
    },
    resolveReport: (reportId) => {
      setState((current) => {
        const report = current.reports.find((item) => item.id === reportId);
        if (!report) {
          return current;
        }
        return {
          ...current,
          reports: current.reports.map((item) => item.id === reportId ? { ...item, status: 'resolved' } : item),
          audit: pushAudit('Oznaczono zgłoszenie jako rozstrzygnięte', report.subject, current.audit),
        };
      });
    },
    setIntegrationStatus: (integrationId, status) => {
      setState((current) => {
        const integration = current.integrations.find((item) => item.id === integrationId);
        if (!integration) {
          return current;
        }
        return {
          ...current,
          integrations: current.integrations.map((item) => item.id === integrationId ? { ...item, status } : item),
          audit: pushAudit(`Zmieniono status integracji na ${status}`, integration.providerName, current.audit),
        };
      });
    },
    addBroadcast: (title) => {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        return;
      }
      setState((current) => ({
        ...current,
        broadcasts: [
          { id: `broadcast_${Date.now().toString(36)}`, title: normalizedTitle, audience: 'Wszystkie placówki', channel: 'E-mail + panel', sentAt: nowLabel() },
          ...current.broadcasts,
        ],
        audit: pushAudit('Wysłano ogłoszenie', normalizedTitle, current.audit),
      }));
    },
    addReferralCode: () => {
      setState((current) => {
        const nextCode: AdminReferralCode = {
          id: `code_${Date.now().toString(36)}`,
          code: `FURLI${Math.floor(Math.random() * 90 + 10)}`,
          discountLabel: '-15% na pierwszy miesiąc',
          uses: 0,
          maxUses: 200,
          active: true,
        };
        return {
          ...current,
          referralCodes: [nextCode, ...current.referralCodes],
          audit: pushAudit('Dodano kod polecający', nextCode.code, current.audit),
        };
      });
    },
    toggleFeatureFlag: (flagId) => {
      setState((current) => {
        const flag = current.featureFlags.find((item) => item.id === flagId);
        if (!flag) {
          return current;
        }
        return {
          ...current,
          featureFlags: current.featureFlags.map((item: AdminFeatureFlag) => item.id === flagId ? { ...item, enabled: !item.enabled } : item),
          audit: pushAudit(flag.enabled ? 'Wyłączono flagę funkcji' : 'Włączono flagę funkcji', flag.label, current.audit),
        };
      });
    },
    resolveGdprRequest: (requestId) => {
      setState((current) => {
        const request = current.gdprRequests.find((item) => item.id === requestId);
        if (!request) {
          return current;
        }
        return {
          ...current,
          gdprRequests: current.gdprRequests.filter((item: AdminGdprRequest) => item.id !== requestId),
          audit: pushAudit('Zrealizowano zgłoszenie RODO', request.subject, current.audit),
        };
      });
    },
  }), [accessToken, activity, logAudit, mergeProviders, refreshActivity, refreshPendingVerificationCount, refreshProviders, remotePendingCount, state]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminState(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminState must be used within AdminStateProvider');
  }
  return context;
}
