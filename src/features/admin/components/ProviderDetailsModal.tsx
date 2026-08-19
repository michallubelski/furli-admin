import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Ban, Check, CreditCard, FileText, LogIn, Mail, MapPin, Phone, Play, RefreshCw, ShieldCheck, Store, X } from '../../../shared/icons';
import { ApiClientError } from '../../../shared/api/client';
import { ConfirmDangerModal, SectionTitle, inputStyle } from '../../../shared/components/ui';
import { C, FONT_HEAD } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import type { ProviderAccount } from '../../../shared/types/furli';
import { approveProvider, getAdminProvider, mapAdminProviderDto, reactivateProvider, rejectProvider, requestProviderChanges, suspendProvider } from '../api';
import { useAdminState } from '../context';
import { activityActionLabel, adminActionButtonStyle, documentLabel, providerTypeLabel, publishRequirementLabel, type AdminProviderRecord } from '../model';
import { AdminAvatar, AdminBadge, BillingBadge, ProviderStatusBadge } from './shared';

type Translate = (key: string, values?: Record<string, string | number>) => string;
type ModalAction = 'approve' | 'reject' | 'request_changes' | 'suspend' | 'reactivate';

function serviceModeLabel(t: Translate, profile: ProviderAccount['profile']): string {
  if (!profile.serviceMode) {
    return profile.type;
  }
  if (profile.serviceMode.stationary && profile.serviceMode.mobile) {
    return t('admin.serviceMode.both');
  }
  if (profile.serviceMode.mobile) {
    return t('admin.serviceMode.mobile');
  }
  if (profile.serviceMode.stationary) {
    return t('admin.serviceMode.stationary');
  }
  return profile.type;
}

function paidUntilLabel(t: Translate, value: number | null): string {
  return value ? new Date(value).toLocaleDateString('pl-PL') : t('admin.generic.noRenewalDate');
}

function workHoursLabel(t: Translate, account: ProviderAccount): string {
  const enabled = (Array.isArray(account.workHours) ? account.workHours : []).filter((item) => item.on);
  if (!enabled.length) {
    return t('admin.providerModal.noFullWorkHours');
  }
  return enabled.map((item) => `${item.short} ${item.open}-${item.close}`).join(', ');
}

function backendDocuments(t: Translate, account: ProviderAccount, provider: AdminProviderRecord) {
  const consentLabel = account.consents
    ? Object.entries(account.consents).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key).join(', ') || t('admin.providerModal.noConsents')
    : t('admin.generic.noData');

  return [
    ...(Array.isArray(provider.documents) ? provider.documents : []).map((document) => ({
      id: document.id,
      label: document.label,
      value: document.status === 'ok' ? t('admin.documentStatus.complete') : document.status === 'expiring' ? t('admin.documentStatus.needsUpdate') : t('admin.documentStatus.missing'),
      tone: document.status,
    })),
    { id: `${account.id}-consents`, label: t('admin.providerModal.consents'), value: consentLabel, tone: account.consents ? 'ok' : 'missing' as const },
    { id: `${account.id}-ref-code`, label: t('admin.providerModal.referralCode'), value: account.refCode || t('admin.generic.no'), tone: account.refCode ? 'ok' : 'missing' as const },
  ];
}

function StatusNotice({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const color = tone === 'success' ? C.green : C.roseDark;
  const background = tone === 'success' ? C.greenLight : 'oklch(0.95 0.04 15)';
  return (
    <div style={{ border: `1px solid ${color}`, background, color, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
      {tone === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

export function ProviderDetailsModal({ providerId, onClose }: { providerId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { accessToken, getProvider, mergeProviders, refreshPendingVerificationCount, refreshProviders, refreshActivity } = useAdminState();
  const provider = getProvider(providerId);
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const [detail, setDetail] = useState<ProviderAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState<'reject' | 'request_changes' | null>(null);
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<ModalAction | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setMode(null);
    setNote('');
    setConfirmingSuspend(false);
    void (async () => {
      try {
        const response = await getAdminProvider(accessToken, providerId);
        if (cancelled) {
          return;
        }
        setDetail(response);
        if (providerRef.current) {
          mergeProviders([mapAdminProviderDto(response, providerRef.current)]);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            providerRef.current
              ? t('admin.providerModal.partialDataError')
              : nextError instanceof ApiClientError
                ? nextError.message
                : t('admin.providerModal.fetchFailed'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, mergeProviders, providerId, t]);

  const mergedProvider = useMemo(() => {
    if (!detail || !provider) {
      return provider;
    }
    return mapAdminProviderDto(detail, provider);
  }, [detail, provider]);

  const displayProvider = mergedProvider ?? provider;
  const isQueue = displayProvider ? displayProvider.verificationStatus === 'pending' || displayProvider.verificationStatus === 'changes_requested' : false;
  const providerHistory = useMemo(() => Array.isArray(detail?.history) ? detail.history : [], [detail]);
  const missingRequirements = Array.isArray(displayProvider?.publishReadiness?.missing)
    ? displayProvider.publishReadiness.missing
    : [];

  const handleAction = async (action: ModalAction) => {
    if (!displayProvider) {
      return;
    }
    setPendingAction(action);
    setError('');
    setSuccessMessage('');
    try {
      const trimmedNote = note.trim() || undefined;
      const response = action === 'approve'
        ? await approveProvider(accessToken, providerId)
        : action === 'reject'
          ? await rejectProvider(accessToken, providerId, trimmedNote)
          : action === 'request_changes'
            ? await requestProviderChanges(accessToken, providerId, trimmedNote)
            : action === 'suspend'
              ? await suspendProvider(accessToken, providerId)
              : await reactivateProvider(accessToken, providerId);

      setDetail(response);
      mergeProviders([mapAdminProviderDto(response, displayProvider)]);
      await refreshProviders();
      await refreshPendingVerificationCount();
      await refreshActivity();
      setMode(null);
      setNote('');
      setSuccessMessage(
        action === 'approve'
          ? t('admin.verification.approvedMessage', { name: displayProvider.name })
          : action === 'reject'
            ? t('admin.verification.rejectedMessage', { name: displayProvider.name })
            : action === 'request_changes'
              ? t('admin.verification.requestedChangesMessage', { name: displayProvider.name })
              : action === 'suspend'
                ? t('admin.providerModal.suspendedMessage', { name: displayProvider.name })
                : t('admin.providerModal.reactivatedMessage', { name: displayProvider.name }),
      );
    } catch (nextError) {
      setError(nextError instanceof ApiClientError ? nextError.message : t('admin.providerModal.actionFailed'));
    } finally {
      setPendingAction(null);
    }
  };

  if (!provider && !loading) {
    return null;
  }

  return (
    <div onClick={onClose} className="furli-sheet-back" style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.02 60 / 0.56)', zIndex: 80, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 16px', overflowY: 'auto' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: C.bgCard, borderRadius: 20, boxShadow: '0 24px 70px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          {displayProvider ? <AdminAvatar provider={displayProvider} size={52} /> : <div style={{ width: 52, height: 52, borderRadius: 16, background: C.bgMuted }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 21, fontWeight: 600, color: C.text }}>{displayProvider?.name || t('admin.providerModal.fallbackName')}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted }}>
              {displayProvider ? `${providerTypeLabel(t, displayProvider.typeLabel)} · ${displayProvider.city}${displayProvider.district ? `, ${displayProvider.district}` : ''}` : t('admin.providerModal.loadingData')}
            </div>
          </div>
          {displayProvider ? <ProviderStatusBadge provider={displayProvider} /> : null}
          {displayProvider ? <BillingBadge provider={displayProvider} /> : null}
          <button onClick={onClose} aria-label={t('common.actions.close')} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: C.bgMuted, color: C.textMedium, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24, maxHeight: '62vh', overflowY: 'auto', display: 'grid', gap: 16 }}>
          {error ? <StatusNotice tone="error" message={error} /> : null}
          {successMessage ? <StatusNotice tone="success" message={successMessage} /> : null}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textMedium, fontSize: 13, fontWeight: 700 }}>
              <RefreshCw size={16} />
              {t('admin.providerModal.loading')}
            </div>
          ) : displayProvider ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <SectionTitle Icon={Store}>{t('admin.providerModal.sections.companyContact')}</SectionTitle>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {[
                      { label: t('admin.providerModal.fields.contactPerson'), value: detail?.contactName || displayProvider.contactName, Icon: Store },
                      { label: t('admin.providerModal.fields.phone'), value: detail?.phone || displayProvider.phone, Icon: Phone },
                      { label: t('admin.providerModal.fields.email'), value: detail?.email || displayProvider.email, Icon: Mail },
                      { label: t('admin.providerModal.fields.address'), value: detail ? `${detail.profile.street} ${detail.profile.houseNumber}, ${detail.profile.postalCode} ${detail.profile.city}` : `${displayProvider.street}, ${displayProvider.postalCode} ${displayProvider.city}`, Icon: MapPin },
                      { label: t('admin.providerModal.fields.providerType'), value: providerTypeLabel(t, displayProvider.typeLabel), Icon: Store },
                      { label: t('admin.providerModal.fields.serviceMode'), value: detail ? serviceModeLabel(t, detail.profile) : providerTypeLabel(t, displayProvider.typeLabel), Icon: Store },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: C.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <item.Icon size={16} color={C.textMedium} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, color: C.textMuted }}>{item.label}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, lineHeight: 1.5, wordBreak: 'break-word' }}>{item.value || t('admin.generic.noData')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle Icon={MapPin}>{t('admin.providerModal.sections.addressOperations')}</SectionTitle>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>{t('admin.providerModal.workHours')}</div>
                      <div style={{ fontSize: 13, color: C.text }}>{detail ? workHoursLabel(t, detail) : t('admin.providerModal.noFullWorkHours')}</div>
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>{t('admin.providerModal.specialties')}</div>
                      <div style={{ fontSize: 13, color: C.text }}>{Array.isArray(detail?.profile.specialties) && detail.profile.specialties.length ? detail.profile.specialties.join(', ') : t('admin.providerModal.noSpecialties')}</div>
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>{t('admin.providerModal.profileDescription')}</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{detail?.profile.description || t('admin.providerModal.noProfileDescription')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 20 }}>
                {/* v44: gotowość do publikacji liczona tą samą funkcją, którą widzi placówka w
                    swoim panelu (backend's PublishReadinessService) - the admin sees exactly what
                    the facility still had to complete, only while it isn't ready yet (mockup
                    furli-admin-v6.jsx:552-566). */}
                {displayProvider.publishReadiness && !displayProvider.publishReadiness.ready ? (
                  <div style={{ padding: '11px 13px', borderRadius: 11, background: 'oklch(0.96 0.05 75 / 0.5)', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>
                      {t('admin.publishReadiness.modalBanner.title', { pct: displayProvider.publishReadiness.pct, done: displayProvider.publishReadiness.done, total: displayProvider.publishReadiness.total })}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textSecondary, lineHeight: 1.5, marginTop: 3 }}>
                      {t('admin.publishReadiness.modalBanner.description', { missing: missingRequirements.map((id) => publishRequirementLabel(t, id)).join(', ') })}
                    </div>
                  </div>
                ) : null}
                <div>
                  <SectionTitle Icon={FileText}>{t('admin.providerModal.sections.documentsRegistration')}</SectionTitle>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(detail ? backendDocuments(t, detail, displayProvider) : displayProvider.documents.map((document) => ({
                      id: document.id,
                      label: documentLabel(t, document.label),
                      value: document.status === 'ok' ? t('admin.documentStatus.complete') : document.status === 'expiring' ? t('admin.documentStatus.needsUpdate') : t('admin.documentStatus.missing'),
                      tone: document.status,
                    }))).map((document) => (
                      <div key={document.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, color: C.textMuted }}>{document.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.5, wordBreak: 'break-word' }}>{document.value}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: document.tone === 'ok' ? C.green : document.tone === 'expiring' ? C.amber : C.textMuted }}>
                          {document.tone === 'ok' ? t('admin.documentStatus.completeShort') : document.tone === 'expiring' ? t('admin.documentStatus.checkShort') : t('admin.documentStatus.missingShort')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionTitle Icon={CreditCard}>{t('admin.providerModal.sections.subscription')}</SectionTitle>
                  <div style={{ padding: '14px 16px', borderRadius: 16, background: C.bgMuted, border: `1px solid ${C.border}`, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <BillingBadge provider={displayProvider} />
                      <AdminBadge label={detail?.billing.planId === 'connected' ? t('admin.subscriptions.planConnected') : t('admin.subscriptions.planMain')} color={C.textMedium} background={C.bgCard} />
                    </div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary }}>{t('admin.providerModal.plan', { plan: detail?.billing.planId || displayProvider.billingPlan || t('admin.providerModal.noPlan') })}</div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary }}>{t('admin.providerModal.billingStatus', { status: detail?.billing.status || displayProvider.billingStatus })}</div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary }}>{t('admin.providerModal.paidUntil', { date: detail ? paidUntilLabel(t, detail.billing.paidUntil) : t('admin.generic.noRenewalDate') })}</div>
                  </div>
                </div>

                <div>
                  <SectionTitle Icon={ShieldCheck}>{t('admin.providerModal.sections.statusHistory')}</SectionTitle>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 16, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <ProviderStatusBadge provider={displayProvider} />
                        {displayProvider.suspended ? <AdminBadge label={t('admin.status.suspended')} color={C.roseDark} background="oklch(0.95 0.04 15)" /> : null}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>{t('admin.providerModal.submittedAt', { date: detail?.createdAt || displayProvider.submittedAt })}</div>
                      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>{t('admin.providerModal.emptyProfile', { value: detail ? (detail.seedEmpty ? t('admin.generic.yes') : t('admin.generic.notAvailable')) : t('admin.generic.noData') })}</div>
                      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>{t('admin.providerModal.slots', { count: Array.isArray(detail?.slots) ? detail.slots.length : t('admin.generic.noData') })}</div>
                      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>{t('admin.providerModal.availableDays', { days: detail ? (Array.isArray(detail.days) && detail.days.length ? detail.days.join(', ') : t('admin.providerModal.noDays')) : t('admin.generic.noData') })}</div>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 16, background: C.bgMuted, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>{t('admin.providerModal.servicesActivity')}</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                        {Array.isArray(detail?.profile.services) && detail.profile.services.length ? detail.profile.services.map((service) => service.name).join(', ') : t('admin.providerModal.rating', { rating: displayProvider.rating > 0 ? displayProvider.rating.toFixed(1) : 0, count: displayProvider.rating > 0 ? displayProvider.reviewsCount : t('admin.providers.noReviews') })}
                      </div>
                    </div>
                    {providerHistory.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMedium, marginBottom: 8 }}>{t('admin.providerModal.history')}</div>
                        {providerHistory.map((entry) => (
                          <div key={entry.id} style={{ fontSize: 11.5, color: C.textSecondary, padding: '4px 0', lineHeight: 1.5 }}>
                            <b>{activityActionLabel(t, entry.action)}</b> · {entry.createdAt} · {entry.adminEmail}
                            {entry.note ? <div style={{ color: C.textMuted, marginTop: 2 }}>{entry.note}</div> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, background: C.bgMuted }}>
          {displayProvider ? (
            isQueue ? (
              mode ? (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: C.text }}>{mode === 'reject' ? t('admin.verification.rejectReasonLabel') : t('admin.providerModal.changesNeededLabel')}</div>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder={t('admin.verification.notePlaceholder')} style={{ ...inputStyle, resize: 'vertical', background: C.bgCard }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                    <button onClick={() => { setMode(null); setNote(''); }} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
                    <button disabled={pendingAction === mode} onClick={() => void handleAction(mode)} style={{ ...adminActionButtonStyle.success, background: mode === 'reject' ? C.roseDark : C.tealDark, opacity: pendingAction === mode ? 0.65 : 1 }}>
                      {mode === 'reject' ? t('admin.verification.rejectSubmit') : t('admin.verification.sendRequest')}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={() => setMode('request_changes')} style={adminActionButtonStyle.warning}>{t('admin.actions.requestChanges')}</button>
                  <button onClick={() => setMode('reject')} style={adminActionButtonStyle.danger}>{t('common.actions.decline')}</button>
                  <button disabled={pendingAction === 'approve'} onClick={() => void handleAction('approve')} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 6px 16px oklch(0.62 0.13 150 / 0.35)', opacity: pendingAction === 'approve' ? 0.65 : 1 }}>
                    <Check size={16} />
                    {t('admin.providerModal.approveProvider')}
                  </button>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={() => setSuccessMessage(t('admin.providerModal.loginAsDemoMessage', { name: displayProvider.name }))} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <LogIn size={15} />
                  {t('admin.providerModal.loginAsDemo')}
                </button>
                {displayProvider.verificationStatus === 'approved' ? (
                  <button
                    disabled={pendingAction === (displayProvider.suspended ? 'reactivate' : 'suspend')}
                    onClick={() => setConfirmingSuspend(true)}
                    style={{ ...(displayProvider.suspended ? adminActionButtonStyle.success : adminActionButtonStyle.danger), display: 'inline-flex', alignItems: 'center', gap: 7, opacity: pendingAction === (displayProvider.suspended ? 'reactivate' : 'suspend') ? 0.65 : 1 }}
                  >
                    {displayProvider.suspended ? <><Play size={15} /> {t('admin.providerModal.reactivateProvider')}</> : <><Ban size={15} /> {t('admin.providerModal.suspendProvider')}</>}
                  </button>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      </div>
      {displayProvider ? (
        <ConfirmDangerModal
          open={confirmingSuspend}
          danger={!displayProvider.suspended}
          title={t(displayProvider.suspended ? 'admin.providers.confirmSuspend.reactivateTitle' : 'admin.providers.confirmSuspend.suspendTitle')}
          body={t(displayProvider.suspended ? 'admin.providers.confirmSuspend.reactivateBody' : 'admin.providers.confirmSuspend.suspendBody', { name: displayProvider.name })}
          confirmWord={displayProvider.name}
          actionLabel={t(displayProvider.suspended ? 'admin.providers.confirmSuspend.reactivateAction' : 'admin.providers.confirmSuspend.suspendAction')}
          onConfirm={() => void handleAction(displayProvider.suspended ? 'reactivate' : 'suspend')}
          onClose={() => setConfirmingSuspend(false)}
        />
      ) : null}
    </div>
  );
}
