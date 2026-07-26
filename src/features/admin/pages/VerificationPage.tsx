import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Eye, RefreshCw } from '../../../shared/icons';
import { Card } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/client';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminAvatar, AdminLinkButton, EmptyState, ProviderStatusBadge, TabButton } from '../components/shared';
import { adminActionButtonStyle, providerTypeLabel } from '../model';
import type { AdminProviderRecord } from '../model';
import { approveProvider, getAdminProviders, mapAdminProviderDto, rejectProvider, requestProviderChanges } from '../api';

// Internal filter values are stable identifiers (not locale-aware) - see providerTypeLabel() for
// why matching stays against these rather than the translated display label.
const TYPE_FILTERS = ['Wszystkie', 'Weterynarz', 'Groomer', 'Trener', 'Petsitter', 'Dog walker'] as const;

type ActionState = {
  providerId: string;
  action: 'approve' | 'reject' | 'request_changes';
} | null;

type NoteMode = 'reject' | 'request_changes';

function StatusNotice({ tone, message }: { tone: 'error' | 'success' | 'info'; message: string }) {
  const color = tone === 'success' ? C.green : tone === 'info' ? C.tealDark : C.roseDark;
  const background = tone === 'success' ? C.greenLight : tone === 'info' ? C.tealLight : 'oklch(0.95 0.04 15)';
  return (
    <div style={{ border: `1px solid ${color}`, background, color, borderRadius: 10, padding: '11px 13px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      {tone === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

export function AdminVerificationPage() {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>('Wszystkie');
  const [providers, setProviders] = useState<AdminProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [actionState, setActionState] = useState<ActionState>(null);
  const [noteMode, setNoteMode] = useState<{ providerId: string; mode: NoteMode } | null>(null);
  const [note, setNote] = useState('');
  const { accessToken, mergeProviders, refreshPendingVerificationCount, refreshActivity } = useAdminState();

  const fetchPendingProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The queue must include both "pending" and "changes_requested" accounts (both are
      // awaiting an admin decision, per the mockup) — the backend only filters on a single
      // status value, so fetch the full list and filter client-side rather than missing
      // "changes_requested" accounts entirely.
      const data = await getAdminProviders(accessToken);
      const mappedProviders = data
        .map((provider) => mapAdminProviderDto(provider))
        .filter((provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested');
      setProviders(mappedProviders);
      mergeProviders(mappedProviders);
    } catch (nextError) {
      if (nextError instanceof ApiClientError) {
        setError(nextError);
      } else {
        setError(new ApiClientError(0, t('admin.verification.fetchFailed')));
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, mergeProviders, t]);

  useEffect(() => {
    void fetchPendingProviders();
  }, [fetchPendingProviders]);

  const shown = useMemo(
    () => providers.filter((provider) => typeFilter === 'Wszystkie' || provider.typeLabel === typeFilter),
    [providers, typeFilter],
  );

  const handleApprove = async (provider: AdminProviderRecord) => {
    setActionState({ providerId: provider.id, action: 'approve' });
    setError(null);
    setSuccessMessage('');
    try {
      await approveProvider(accessToken, provider.id);
      setSuccessMessage(t('admin.verification.approvedMessage', { name: provider.name }));
      await fetchPendingProviders();
      await refreshPendingVerificationCount();
      await refreshActivity();
    } catch (nextError) {
      if (nextError instanceof ApiClientError) {
        setError(nextError);
      } else {
        setError(new ApiClientError(0, t('admin.verification.approveFailed')));
      }
    } finally {
      setActionState(null);
    }
  };

  const handleNoteAction = async (provider: AdminProviderRecord, mode: NoteMode) => {
    setActionState({ providerId: provider.id, action: mode });
    setError(null);
    setSuccessMessage('');
    try {
      if (mode === 'reject') {
        await rejectProvider(accessToken, provider.id, note.trim() || undefined);
        setSuccessMessage(t('admin.verification.rejectedMessage', { name: provider.name }));
      } else {
        await requestProviderChanges(accessToken, provider.id, note.trim() || undefined);
        setSuccessMessage(t('admin.verification.requestedChangesMessage', { name: provider.name }));
      }
      setNoteMode(null);
      setNote('');
      await fetchPendingProviders();
      await refreshPendingVerificationCount();
      await refreshActivity();
    } catch (nextError) {
      if (nextError instanceof ApiClientError) {
        setError(nextError);
      } else {
        setError(new ApiClientError(0, mode === 'reject' ? t('admin.verification.rejectFailed') : t('admin.verification.requestChangesFailed')));
      }
    } finally {
      setActionState(null);
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 10, color: C.textMedium, fontSize: 13, fontWeight: 700 }}>
        <RefreshCw size={16} />
        {t('admin.verification.loading')}
      </Card>
    );
  }

  const accessDenied = error?.status === 403;

  return (
    <div>
      {error ? (
        <StatusNotice
          tone="error"
          message={accessDenied ? t('admin.verification.accessDenied') : error.message}
        />
      ) : null}
      {successMessage ? <StatusNotice tone="success" message={successMessage} /> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TYPE_FILTERS.map((filter) => (
          <TabButton
            key={filter}
            active={typeFilter === filter}
            label={filter === 'Wszystkie' ? t('admin.verification.typeFilterAll') : providerTypeLabel(t, filter)}
            onClick={() => setTypeFilter(filter)}
          />
        ))}
        <button onClick={() => void fetchPendingProviders()} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={14} />
          {t('common.actions.refresh')}
        </button>
      </div>

      {!shown.length ? (
        <EmptyState title={t('admin.verification.emptyQueueTitle')} description={t('admin.verification.emptyQueueDescription')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map((provider) => {
            const approving = actionState?.providerId === provider.id && actionState.action === 'approve';
            const rejecting = actionState?.providerId === provider.id && actionState.action === 'reject';
            const requestingChanges = actionState?.providerId === provider.id && actionState.action === 'request_changes';
            const noteOpen = noteMode?.providerId === provider.id ? noteMode.mode : null;
            return (
              <Card key={provider.id} style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <AdminAvatar provider={provider} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{provider.name}</span>
                      <ProviderStatusBadge provider={provider} />
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>
                      {providerTypeLabel(t, provider.typeLabel)} / {provider.city}{provider.district ? `, ${provider.district}` : ''} / {t('admin.verification.submittedAt', { date: provider.submittedAt })}
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                      {provider.contactName} / {provider.email} / {provider.phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <AdminLinkButton to={`/providers?providerId=${provider.id}`}>
                      <Eye size={14} />
                      {t('admin.actions.review')}
                    </AdminLinkButton>
                    <button onClick={() => setNoteMode(noteOpen === 'request_changes' ? null : { providerId: provider.id, mode: 'request_changes' })} style={adminActionButtonStyle.warning}>{t('admin.actions.requestChanges')}</button>
                    <button onClick={() => setNoteMode(noteOpen === 'reject' ? null : { providerId: provider.id, mode: 'reject' })} style={adminActionButtonStyle.danger}>{t('common.actions.decline')}</button>
                    <button disabled={approving} onClick={() => void handleApprove(provider)} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: approving ? 0.65 : 1 }}>
                      <Check size={15} />
                      {approving ? t('admin.verification.approving') : t('common.actions.approve')}
                    </button>
                  </div>
                </div>
                {noteOpen ? (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                      {noteOpen === 'reject' ? t('admin.verification.rejectReasonLabel') : t('admin.verification.changesNeededLabel')}
                    </label>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={2}
                      placeholder={t('admin.verification.notePlaceholder')}
                      style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, background: C.bgCard, padding: 11, resize: 'vertical', font: 'inherit', fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                      <button onClick={() => { setNoteMode(null); setNote(''); }} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
                      <button
                        disabled={noteOpen === 'reject' ? rejecting : requestingChanges}
                        onClick={() => void handleNoteAction(provider, noteOpen)}
                        style={{ ...(noteOpen === 'reject' ? adminActionButtonStyle.danger : adminActionButtonStyle.warning), opacity: (noteOpen === 'reject' ? rejecting : requestingChanges) ? 0.65 : 1 }}
                      >
                        {noteOpen === 'reject' ? (rejecting ? t('admin.verification.rejecting') : t('admin.verification.rejectSubmit')) : (requestingChanges ? t('admin.verification.sending') : t('admin.verification.sendRequest'))}
                      </button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
