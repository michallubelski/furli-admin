import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Notice, NoticeTone } from '../../shared/components/ui';
import type { ReactNode } from 'react';
import type { AdminActivityLogEntry } from '../../shared/types/furli';
import { nowLabel } from '../../shared/utils/furli';
import { createAdminSeedData, type AdminSeedData } from './mockData';
import { completeAdminGdprRequest, createAdminBroadcast, createAdminCatalogEntry, createAdminReferralCode, deleteAdminCatalogEntry, getAdminActivity, getAdminAudit, getAdminBroadcasts, getAdminCatalog, getAdminGdprRequests, getAdminPendingProviderCount, getAdminProviders, getAdminReferralCodes, getAdminReports, getAdminUsers, mapAdminProviderDto, setAdminCatalogVisibility, updateAdminCatalogEntry, updateAdminReport } from './api';
import type {
  AdminFeatureFlag,
  AdminGdprRequest,
  AdminIntegrationRecord,
  AdminProviderRecord,
  AdminReferralCode,
  AdminReviewRecord,
} from './model';
import { SERVICE_CATALOG_BASE, serviceKeyFromName } from '../../shared/constants/serviceCatalog';
import { SPECIALTIES_BY_TYPE } from '../../shared/constants/specialties';
import type { CatalogKind } from './catalog';
import { listReviews, REVIEWS_CHANGED_EVENT } from './reviews/api';
import { listOrders, ORDERS_CHANGED_EVENT } from './orders/api';
import type { ProviderType } from '../../shared/types/furli';

const STORAGE_KEY = 'furli_admin_v1';

interface AdminContextValue extends AdminSeedData {
  pendingVerificationCount: number;
  accessToken: string;
  activity: AdminActivityLogEntry[];
  // The outcome of an action, shown in a dialog (NoticeModal) - never a toast.
  notice: Notice | null;
  showNotice: (message: string, tone?: NoticeTone) => void;
  closeNotice: () => void;
  refreshActivity: () => Promise<void>;
  getProvider: (providerId: string) => AdminProviderRecord | null;
  mergeProviders: (providers: AdminProviderRecord[]) => void;
  refreshProviders: () => Promise<void>;
  refreshPendingVerificationCount: () => Promise<void>;
  logAudit: (action: string, target: string) => void;
  /** Reported reviews waiting for a decision (the sidebar badge); `reviews` lists them for the queue. */
  reportedReviewCount: number;
  /** New shop orders waiting to be packed (status CONFIRMED) - the sidebar badge. */
  newOrderCount: number;
  resolveReport: (reportId: string) => Promise<void>;
  setIntegrationStatus: (integrationId: string, status: AdminIntegrationRecord['status']) => void;
  addBroadcast: (title: string, audience?: string, channel?: string) => Promise<void>;
  addReferralCode: () => Promise<void>;
  toggleFeatureFlag: (flagId: string) => void;
  resolveGdprRequest: (requestId: string) => Promise<void>;
  addCatalogEntry: (kind: CatalogKind, type: ProviderType, label: string, sub: string) => Promise<void>;
  updateCatalogEntry: (kind: CatalogKind, type: ProviderType, id: string, label: string, sub: string) => Promise<void>;
  setCatalogEntryHidden: (kind: CatalogKind, type: ProviderType, id: string, hidden: boolean, label: string, sub: string) => Promise<void>;
  deleteCatalogEntry: (kind: CatalogKind, type: ProviderType, id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function loadAdminState(): AdminSeedData {
  const seed = createAdminSeedData();
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      return { ...seed, providers: [] };
    }
    // Merge over a fresh seed rather than trusting the stored blob's shape outright - a session
    // saved before a new slice (e.g. catalogOverlay) was added would otherwise come back missing
    // it entirely and crash the first screen that reads it.
    const persisted = JSON.parse(raw) as Partial<AdminSeedData>;
    // Providers are authoritative backend data. Never hydrate the list from the old demo seed or
    // a cached API response: stale records can have a different shape and must not briefly appear
    // before the current API request finishes.
    return { ...seed, ...persisted, providers: [], reviews: [], reports: [], broadcasts: [], referralCodes: [], gdprRequests: [], admins: [], audit: [], catalogOverlay: seed.catalogOverlay };
  } catch {
    return { ...seed, providers: [] };
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
  const [notice, setNotice] = useState<Notice | null>(null);

  // One notice at a time; a newer one replaces it.
  const showNotice = useCallback((message: string, tone: NoticeTone = 'success') => setNotice({ message, tone }), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    try {
      // Keep the still-local mock/admin UI slices, but deliberately omit providers. The backend is
      // their sole source of truth and refreshProviders() repopulates them for every app session.
      const {
        providers: _providers,
        reviews: _reviews,
        reports: _reports,
        broadcasts: _broadcasts,
        referralCodes: _referralCodes,
        gdprRequests: _gdprRequests,
        admins: _admins,
        catalogOverlay: _catalogOverlay,
        audit: _audit,
        ...persistedState
      } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
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
    setRemotePendingCount(remoteProviders.filter(
      (provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested',
    ).length);
  }, [accessToken]);

  const refreshPendingVerificationCount = useCallback(async () => {
    try {
      // Count-only endpoint avoids downloading every provider again after an admin action.
      setRemotePendingCount(await getAdminPendingProviderCount(accessToken));
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
    void refreshActivity();
  }, [refreshActivity]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getAdminReports(accessToken),
      getAdminBroadcasts(accessToken),
      getAdminReferralCodes(accessToken),
      getAdminGdprRequests(accessToken),
      getAdminCatalog(accessToken),
      getAdminUsers(accessToken),
      getAdminAudit(accessToken),
    ]).then(([reports, broadcasts, referralCodes, gdprRequests, catalog, adminUsers, audit]) => {
      if (!cancelled) {
        const catalogOverlay = { services: { added: [], edited: {}, hidden: [] }, specialties: { added: [], edited: {}, hidden: [] } } as AdminSeedData['catalogOverlay'];
        catalog.forEach((entry) => {
          const isBase = entry.kind === 'services'
            ? SERVICE_CATALOG_BASE[entry.providerType].some((item) => item.key === entry.key)
            : SPECIALTIES_BY_TYPE[entry.providerType].some((item) => item.id === entry.key);
          if (isBase) catalogOverlay[entry.kind].edited[entry.key] = { label: entry.label, sub: entry.description || '' };
          else catalogOverlay[entry.kind].added.push({ id: entry.key, type: entry.providerType, label: entry.label, sub: entry.description || '' });
          if (entry.hidden) catalogOverlay[entry.kind].hidden.push(entry.key);
        });
        const admins = adminUsers.map((admin) => ({ id: admin.id, name: admin.name || admin.email.split('@')[0], email: admin.email, roleLabel: admin.adminRole || admin.role, lastSeen: admin.lastActiveAt ? new Date(admin.lastActiveAt).toLocaleString('pl-PL') : '—', presenceLabel: admin.lastActiveAt && Date.now() - new Date(admin.lastActiveAt).getTime() < 5 * 60_000 ? 'online' : undefined }));
        setState((current) => ({ ...current, reports, broadcasts, referralCodes, gdprRequests, catalogOverlay, admins, audit }));
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [accessToken]);

  const [reportedReviewCount, setReportedReviewCount] = useState(0);
  const loadReportedReviews = useCallback(() => {
    listReviews(accessToken, { tab: 'reported', size: 50 })
      .then((page) => {
        setReportedReviewCount(page.counts.reported);
        const reviews: AdminReviewRecord[] = page.items.map((review) => ({
          id: review.id,
          providerName: review.providerName,
          author: review.author,
          rating: review.rating,
          text: review.text || '',
          date: new Date(review.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }),
          reason: '',
          status: 'reported',
          openReports: review.openReports,
        }));
        setState((current) => ({ ...current, reviews }));
      })
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    loadReportedReviews();
    window.addEventListener(REVIEWS_CHANGED_EVENT, loadReportedReviews);
    return () => window.removeEventListener(REVIEWS_CHANGED_EVENT, loadReportedReviews);
  }, [loadReportedReviews]);

  const [newOrderCount, setNewOrderCount] = useState(0);
  const loadNewOrderCount = useCallback(() => {
    listOrders(accessToken, { tab: 'CONFIRMED', size: 1 })
      .then((page) => setNewOrderCount(page.counts.CONFIRMED))
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    loadNewOrderCount();
    window.addEventListener(ORDERS_CHANGED_EVENT, loadNewOrderCount);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, loadNewOrderCount);
  }, [loadNewOrderCount]);

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
    notice,
    closeNotice,
    showNotice,
    refreshActivity,
    pendingVerificationCount: remotePendingCount ?? state.providers.filter((provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested').length,
    getProvider: (providerId: string) => state.providers.find((provider) => provider.id === providerId) || null,
    mergeProviders,
    refreshProviders,
    refreshPendingVerificationCount,
    logAudit,
    reportedReviewCount,
    newOrderCount,
    resolveReport: async (reportId) => {
      await updateAdminReport(accessToken, reportId, 'resolved');
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
    addBroadcast: async (title, audience = 'all', channel = 'email') => {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        return;
      }
      const created = await createAdminBroadcast(accessToken, normalizedTitle, audience, channel);
      setState((current) => ({
        ...current,
        broadcasts: [
          created,
          ...current.broadcasts,
        ],
        audit: pushAudit('Wysłano ogłoszenie', normalizedTitle, current.audit),
      }));
    },
    addReferralCode: async () => {
      const generatedCode = `FURLI${crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(-6)}`;
      const created = await createAdminReferralCode(accessToken, generatedCode, '-15% na pierwszy miesiąc', 200);
      setState((current) => {
        const nextCode: AdminReferralCode = created;
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
    resolveGdprRequest: async (requestId) => {
      await completeAdminGdprRequest(accessToken, requestId);
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
    // Catalogs (services/specialties) are closed lists the provider panel picks from rather than
    // free text - see shared/constants/serviceCatalog.ts. The seed lists are the grain; everything
    // added/edited/hidden from this screen lives as an overlay on top, same split the mockup uses,
    // so re-seeding the base list later never wipes what an operator added.
    addCatalogEntry: async (kind, type, label, sub) => {
      const trimmedLabel = label.trim();
      if (!trimmedLabel) {
        return;
      }
      const id = serviceKeyFromName(trimmedLabel);
      if (!id) {
        return;
      }
      await createAdminCatalogEntry(accessToken, kind, type, id, trimmedLabel, sub.trim());
      setState((current) => {
        const overlay = current.catalogOverlay[kind];
        if (overlay.added.some((entry) => entry.id === id && entry.type === type)) {
          return current;
        }
        return {
          ...current,
          catalogOverlay: {
            ...current.catalogOverlay,
            [kind]: { ...overlay, added: [...overlay.added, { id, type, label: trimmedLabel, sub: sub.trim() }] },
          },
          audit: pushAudit(kind === 'services' ? 'Dodano usługę do katalogu' : 'Dodano specjalizację do katalogu', trimmedLabel, current.audit),
        };
      });
    },
    updateCatalogEntry: async (kind, type, id, label, sub) => {
      await updateAdminCatalogEntry(accessToken, kind, type, id, label, sub);
      setState((current) => {
        const overlay = current.catalogOverlay[kind];
        return {
          ...current,
          catalogOverlay: {
            ...current.catalogOverlay,
            [kind]: { ...overlay, edited: { ...overlay.edited, [id]: { label, sub } } },
          },
          audit: pushAudit(kind === 'services' ? 'Zmieniono usługę w katalogu' : 'Zmieniono specjalizację w katalogu', label, current.audit),
        };
      });
    },
    setCatalogEntryHidden: async (kind, type, id, hidden, label, sub) => {
      await updateAdminCatalogEntry(accessToken, kind, type, id, label, sub);
      await setAdminCatalogVisibility(accessToken, kind, type, id, hidden);
      setState((current) => {
        const overlay = current.catalogOverlay[kind];
        const nextHidden = hidden ? [...overlay.hidden, id] : overlay.hidden.filter((entryId) => entryId !== id);
        return {
          ...current,
          catalogOverlay: { ...current.catalogOverlay, [kind]: { ...overlay, hidden: nextHidden } },
          audit: pushAudit(hidden ? 'Ukryto pozycję katalogu' : 'Przywrócono pozycję katalogu', id, current.audit),
        };
      });
    },
    deleteCatalogEntry: async (kind, type, id) => {
      await deleteAdminCatalogEntry(accessToken, kind, type, id);
      setState((current) => {
        const overlay = current.catalogOverlay[kind];
        return {
          ...current,
          catalogOverlay: {
            ...current.catalogOverlay,
            [kind]: { ...overlay, added: overlay.added.filter((entry) => entry.id !== id), hidden: overlay.hidden.filter((entryId) => entryId !== id) },
          },
          audit: pushAudit('Usunięto pozycję katalogu', id, current.audit),
        };
      });
    },
  }), [accessToken, activity, logAudit, mergeProviders, refreshActivity, refreshPendingVerificationCount, refreshProviders, remotePendingCount, showNotice, closeNotice, state, notice, reportedReviewCount, newOrderCount]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminState(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminState must be used within AdminStateProvider');
  }
  return context;
}
