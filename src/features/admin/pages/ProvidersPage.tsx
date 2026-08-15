import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Eye, Play } from '../../../shared/icons';
import { Card, ConfirmDangerModal } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/client';
import { C, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { ProviderDetailsModal } from '../components/ProviderDetailsModal';
import { useAdminState } from '../context';
import type { AdminProviderExpiredSubFilter, AdminProviderListFilter, AdminProviderPublishedSubFilter, AdminProviderRecord } from '../model';
import { providerTypeLabel, publishRequirementLabel } from '../model';
import { mapAdminProviderDto, reactivateProvider, suspendProvider } from '../api';
import { AdminAvatar, AdminBadge, AdminDevNote, AdminLinkButton, BillingBadge, ProviderStatusBadge, SearchField, TabButton } from '../components/shared';

// v44: the "published" tab counts an approved, unsuspended facility whose subscription is either
// still in trial or a real paying subscription - everything past that (grace/expired) has its own
// tab. Matches the mockup's own `published(p)` predicate (furli-admin-v6.jsx:395).
function isPublished(provider: AdminProviderRecord): boolean {
  return provider.verificationStatus === 'approved' && !provider.suspended && (provider.billingPhase === 'trial' || provider.billingPhase === 'active');
}
function isExpired(provider: AdminProviderRecord): boolean {
  return provider.billingPhase === 'dormant' || provider.billingPhase === 'past_due' || provider.billingPhase === 'canceled';
}

export function AdminProvidersPage() {
  const { t } = useI18n();
  const TABS: Array<{ id: AdminProviderListFilter; label: string }> = [
    { id: 'registered', label: t('admin.providers.tabs.registered') },
    { id: 'published', label: t('admin.providers.tabs.published') },
    { id: 'trial', label: t('admin.providers.tabs.trial') },
    { id: 'grace', label: t('admin.providers.tabs.grace') },
    { id: 'suspended', label: t('admin.providers.tabs.suspended') },
    { id: 'rejected', label: t('admin.providers.tabs.rejected') },
    { id: 'expired', label: t('admin.providers.tabs.expired') },
  ];
  const { providers, accessToken, mergeProviders, refreshPendingVerificationCount, refreshActivity, showToast } = useAdminState();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<AdminProviderListFilter>('registered');
  const [publishedSub, setPublishedSub] = useState<AdminProviderPublishedSubFilter>('all');
  const [expiredSub, setExpiredSub] = useState<AdminProviderExpiredSubFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const providerId = searchParams.get('providerId') || '';
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<AdminProviderRecord | null>(null);

  const pickTab = (id: AdminProviderListFilter) => {
    setTab(id);
    setPublishedSub('all');
    setExpiredSub('all');
  };

  const tabCounts = useMemo<Record<AdminProviderListFilter, number>>(() => ({
    registered: providers.filter((p) => p.verificationStatus === 'pending' || p.verificationStatus === 'changes_requested' || (p.verificationStatus !== 'approved' && p.verificationStatus !== 'rejected')).length,
    published: providers.filter(isPublished).length,
    trial: providers.filter((p) => p.verificationStatus === 'approved' && !p.suspended && p.billingPhase === 'trial').length,
    grace: providers.filter((p) => p.billingPhase === 'grace').length,
    suspended: providers.filter((p) => p.suspended).length,
    rejected: providers.filter((p) => p.verificationStatus === 'rejected').length,
    expired: providers.filter(isExpired).length,
  }), [providers]);

  const rows = useMemo(() => providers.filter((provider) => {
    const matchQuery = !query || provider.name.toLowerCase().includes(query.toLowerCase()) || provider.city.toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) {
      return false;
    }
    switch (tab) {
      case 'registered':
        // "changes_requested" stays here too - the facility is still fixing its profile, it hasn't
        // been rejected (that's a separate, terminal decision).
        return provider.verificationStatus !== 'approved' && provider.verificationStatus !== 'rejected';
      case 'published': {
        if (!isPublished(provider)) {
          return false;
        }
        if (publishedSub === 'trial') {
          return provider.billingPhase === 'trial';
        }
        if (publishedSub === 'paid') {
          return provider.billingPhase === 'active';
        }
        return true;
      }
      case 'trial':
        return provider.verificationStatus === 'approved' && !provider.suspended && provider.billingPhase === 'trial';
      case 'grace':
        return provider.billingPhase === 'grace';
      case 'suspended':
        return provider.suspended;
      case 'rejected':
        return provider.verificationStatus === 'rejected';
      case 'expired': {
        if (!isExpired(provider)) {
          return false;
        }
        if (expiredSub === 'demo') {
          return provider.billingPhase === 'dormant';
        }
        if (expiredSub === 'paid') {
          return provider.billingPhase === 'past_due' || provider.billingPhase === 'canceled';
        }
        return true;
      }
      default:
        return true;
    }
  }), [providers, query, tab, publishedSub, expiredSub]);

  const closeModal = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('providerId');
    setSearchParams(nextParams);
  };

  const handleToggleSuspend = async (provider: AdminProviderRecord) => {
    setTogglingId(provider.id);
    setActionError('');
    try {
      const response = provider.suspended
        ? await reactivateProvider(accessToken, provider.id)
        : await suspendProvider(accessToken, provider.id);
      mergeProviders([mapAdminProviderDto(response, provider)]);
      await refreshPendingVerificationCount();
      await refreshActivity();
      showToast(t(provider.suspended ? 'admin.providers.confirmSuspend.reactivateSuccess' : 'admin.providers.confirmSuspend.suspendSuccess'));
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('admin.providers.suspendToggleFailed'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      {actionError ? (
        <div style={{ border: `1px solid ${C.roseDark}`, background: 'oklch(0.95 0.04 15)', color: C.roseDark, borderRadius: 10, padding: '11px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {actionError}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <SearchField value={query} onChange={setQuery} placeholder={t('admin.providers.searchPlaceholder')} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((item) => <TabButton key={item.id} active={tab === item.id} label={item.label} count={tabCounts[item.id]} onClick={() => pickTab(item.id)} />)}
        </div>
      </div>
      {tab === 'published' || tab === 'expired' ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14, marginTop: -4 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t('admin.providers.subfilterLabel')}</span>
          {tab === 'published'
            ? (['all', 'trial', 'paid'] as const).map((id) => (
              <button key={id} onClick={() => setPublishedSub(id)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${publishedSub === id ? C.tealDark : C.border}`, background: publishedSub === id ? C.tealLight : C.bgCard, color: publishedSub === id ? C.tealDark : C.textMedium }}>
                {t(`admin.providers.publishedSub.${id}`)}
              </button>
            ))
            : (['all', 'demo', 'paid'] as const).map((id) => (
              <button key={id} onClick={() => setExpiredSub(id)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${expiredSub === id ? C.tealDark : C.border}`, background: expiredSub === id ? C.tealLight : C.bgCard, color: expiredSub === id ? C.tealDark : C.textMedium }}>
                {t(`admin.providers.expiredSub.${id}`)}
              </button>
            ))}
        </div>
      ) : null}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {!rows.length ? <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: C.textMuted }}>{t('admin.providers.emptyResults')}</div> : null}
        {rows.map((provider, index) => {
          const toggling = togglingId === provider.id;
          const readiness = provider.publishReadiness;
          return (
            <div key={provider.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: index < rows.length - 1 ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap' }}>
              <AdminAvatar provider={provider} size={42} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{provider.name}</span>
                  {provider.suspended ? <AdminBadge label={t('admin.status.suspended')} color={C.roseDark} background="oklch(0.95 0.04 15)" /> : null}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  {providerTypeLabel(t, provider.typeLabel)} · {provider.city} · {provider.rating > 0 ? `★ ${String(provider.rating).replace('.', ',')} (${provider.reviewsCount})` : t('admin.providers.noReviews')}
                </div>
              </div>
              {tab === 'registered' && readiness ? (
                // v44: on the "Zarejestrowane" tab the admin cares about profile completeness, not
                // billing (the trial doesn't run before publication anyway) - mirrors the mockup's
                // own completeness bar (furli-admin-v6.jsx:473-486).
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 210, maxWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 999, background: C.bgMuted, overflow: 'hidden' }}>
                      <div style={{ width: `${readiness.pct}%`, height: '100%', borderRadius: 999, background: readiness.pct >= 80 ? C.green : readiness.pct >= 50 ? C.amber : C.roseDark }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.textSecondary, fontFamily: FONT_NUM }}>{readiness.pct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {readiness.missing.length
                      ? t('admin.providers.completeness.missing', { list: readiness.missing.map((id) => publishRequirementLabel(t, id)).join(', ') })
                      : t('admin.providers.completeness.complete')}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  <ProviderStatusBadge provider={provider} />
                  <BillingBadge provider={provider} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 7 }}>
                <AdminLinkButton to={`/providers?providerId=${provider.id}`}>
                  <Eye size={13} />
                  {t('common.actions.preview')}
                </AdminLinkButton>
                {provider.verificationStatus === 'approved' ? (
                  <button
                    disabled={toggling}
                    onClick={() => setConfirmTarget(provider)}
                    style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: provider.suspended ? C.green : 'oklch(0.95 0.04 15)', color: provider.suspended ? '#fff' : C.roseDark, fontSize: 12, fontWeight: 700, cursor: toggling ? 'default' : 'pointer', opacity: toggling ? 0.65 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    {provider.suspended ? <><Play size={13} /> {t('admin.providers.reactivateAction')}</> : <><Ban size={13} /> {t('common.actions.suspend')}</>}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </Card>
      <AdminDevNote>{t('admin.providers.devNote')}</AdminDevNote>
      {providerId ? <ProviderDetailsModal providerId={providerId} onClose={closeModal} /> : null}
      <ConfirmDangerModal
        open={!!confirmTarget}
        danger={confirmTarget ? !confirmTarget.suspended : true}
        title={t(confirmTarget?.suspended ? 'admin.providers.confirmSuspend.reactivateTitle' : 'admin.providers.confirmSuspend.suspendTitle')}
        body={t(confirmTarget?.suspended ? 'admin.providers.confirmSuspend.reactivateBody' : 'admin.providers.confirmSuspend.suspendBody', { name: confirmTarget?.name || '' })}
        confirmWord={confirmTarget?.name || ''}
        actionLabel={t(confirmTarget?.suspended ? 'admin.providers.confirmSuspend.reactivateAction' : 'admin.providers.confirmSuspend.suspendAction')}
        onConfirm={() => { if (confirmTarget) void handleToggleSuspend(confirmTarget); }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
