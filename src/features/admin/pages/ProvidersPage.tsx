import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Eye, Play } from '../../../shared/icons';
import { Card, ConfirmDangerModal } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/client';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { ProviderDetailsModal } from '../components/ProviderDetailsModal';
import { useAdminState } from '../context';
import type { AdminProviderListFilter, AdminProviderRecord } from '../model';
import { providerTypeLabel } from '../model';
import { mapAdminProviderDto, reactivateProvider, suspendProvider } from '../api';
import { AdminAvatar, AdminBadge, AdminLinkButton, BillingBadge, ProviderStatusBadge, SearchField, TabButton } from '../components/shared';

export function AdminProvidersPage() {
  const { t } = useI18n();
  const FILTERS: Array<{ id: AdminProviderListFilter; label: string }> = [
    { id: 'all', label: t('admin.providers.filters.all') },
    { id: 'pending', label: t('admin.providers.filters.pending') },
    { id: 'approved', label: t('admin.providers.filters.approved') },
    { id: 'suspended', label: t('admin.providers.filters.suspended') },
    { id: 'rejected', label: t('admin.providers.filters.rejected') },
  ];
  const { providers, accessToken, mergeProviders, refreshPendingVerificationCount, refreshActivity, showToast } = useAdminState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AdminProviderListFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const providerId = searchParams.get('providerId') || '';
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<AdminProviderRecord | null>(null);

  const rows = useMemo(() => providers.filter((provider) => {
    const matchQuery = !query || provider.name.toLowerCase().includes(query.toLowerCase()) || provider.city.toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) {
      return false;
    }
    switch (filter) {
      case 'pending':
        return provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested';
      case 'approved':
        return provider.verificationStatus === 'approved' && !provider.suspended;
      case 'suspended':
        return provider.suspended;
      case 'rejected':
        return provider.verificationStatus === 'rejected';
      default:
        return true;
    }
  }), [providers, query, filter]);

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
          {FILTERS.map((item) => <TabButton key={item.id} active={filter === item.id} label={item.label} onClick={() => setFilter(item.id)} />)}
        </div>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {!rows.length ? <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: C.textMuted }}>{t('admin.providers.emptyResults')}</div> : null}
        {rows.map((provider, index) => {
          const toggling = togglingId === provider.id;
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
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <ProviderStatusBadge provider={provider} />
                <BillingBadge provider={provider} />
              </div>
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
