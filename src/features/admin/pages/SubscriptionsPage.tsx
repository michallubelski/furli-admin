import { useEffect, useState } from 'react';
import { AlertCircle, Check, Clock, CreditCard, Percent, X } from '../../../shared/icons';
import { Card, inputStyle } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/client';
import { C, FONT_HEAD } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { applyProviderDiscount, extendProviderTrial, mapAdminProviderDto } from '../api';
import { AdminAvatar, BillingBadge, KpiCard, ProviderStatusBadge } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminProviderRecord } from '../model';

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0.2 0.02 60 / 0.56)', zIndex: 80, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: C.bgCard, borderRadius: 20, boxShadow: '0 24px 70px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 18, fontWeight: 600, color: C.text }}>{title}</div>
          <button onClick={onClose} aria-label={t('common.actions.close')} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: C.bgMuted, color: C.textMedium, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function DiscountModal({ provider, onClose, onConfirm, submitting }: {
  provider: AdminProviderRecord;
  onClose: () => void;
  onConfirm: (percent: number, durationMonths: number) => void;
  submitting: boolean;
}) {
  const { t } = useI18n();
  const [percent, setPercent] = useState('20');
  const [durationMonths, setDurationMonths] = useState('3');
  const [validationError, setValidationError] = useState('');

  const handleConfirm = () => {
    const percentValue = Number(percent);
    const durationValue = Number(durationMonths);
    if (!Number.isFinite(percentValue) || percentValue < 1 || percentValue > 100) {
      setValidationError(t('admin.subscriptions.discountModal.percentRangeError'));
      return;
    }
    if (!Number.isFinite(durationValue) || durationValue < 1) {
      setValidationError(t('admin.subscriptions.discountModal.durationError'));
      return;
    }
    setValidationError('');
    onConfirm(percentValue, durationValue);
  };

  return (
    <ModalShell title={t('admin.subscriptions.discountModal.title', { name: provider.name })} onClose={onClose}>
      {validationError ? (
        <div style={{ border: `1px solid ${C.roseDark}`, background: 'oklch(0.95 0.04 15)', color: C.roseDark, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {validationError}
        </div>
      ) : null}
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('admin.subscriptions.discountModal.percentLabel')}</label>
      <input type="number" min={1} max={100} value={percent} onChange={(event) => setPercent(event.target.value)} style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('admin.subscriptions.discountModal.durationLabel')}</label>
      <input type="number" min={1} value={durationMonths} onChange={(event) => setDurationMonths(event.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
        <button disabled={submitting} onClick={handleConfirm} style={{ ...adminActionButtonStyle.success, opacity: submitting ? 0.65 : 1 }}>
          {submitting ? t('admin.subscriptions.discountModal.saving') : t('admin.subscriptions.discountModal.confirm')}
        </button>
      </div>
    </ModalShell>
  );
}

function ExtendTrialModal({ provider, onClose, onConfirm, submitting }: {
  provider: AdminProviderRecord;
  onClose: () => void;
  onConfirm: (days: number) => void;
  submitting: boolean;
}) {
  const { t } = useI18n();
  const [days, setDays] = useState('14');
  const [validationError, setValidationError] = useState('');

  const handleConfirm = () => {
    const daysValue = Number(days);
    if (!Number.isFinite(daysValue) || daysValue < 1) {
      setValidationError(t('admin.subscriptions.extendTrialModal.daysError'));
      return;
    }
    setValidationError('');
    onConfirm(daysValue);
  };

  return (
    <ModalShell title={t('admin.subscriptions.extendTrialModal.title', { name: provider.name })} onClose={onClose}>
      {validationError ? (
        <div style={{ border: `1px solid ${C.roseDark}`, background: 'oklch(0.95 0.04 15)', color: C.roseDark, borderRadius: 10, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {validationError}
        </div>
      ) : null}
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 6 }}>{t('admin.subscriptions.extendTrialModal.daysLabel')}</label>
      <input type="number" min={1} value={days} onChange={(event) => setDays(event.target.value)} style={{ ...inputStyle, marginBottom: 18 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
        <button disabled={submitting} onClick={handleConfirm} style={{ ...adminActionButtonStyle.success, opacity: submitting ? 0.65 : 1 }}>
          {submitting ? t('admin.subscriptions.extendTrialModal.saving') : t('admin.subscriptions.extendTrialModal.confirm')}
        </button>
      </div>
    </ModalShell>
  );
}

export function AdminSubscriptionsPage() {
  const { t } = useI18n();
  const { providers, accessToken, mergeProviders, refreshActivity } = useAdminState();
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [discountTarget, setDiscountTarget] = useState<AdminProviderRecord | null>(null);
  const [trialTarget, setTrialTarget] = useState<AdminProviderRecord | null>(null);
  const approved = providers.filter((provider) => provider.verificationStatus === 'approved');
  const active = approved.filter((provider) => provider.billingStatus === 'active');
  const trial = approved.filter((provider) => provider.billingStatus === 'trial');
  const overdue = approved.filter((provider) => provider.billingStatus === 'overdue');
  const mrr = active.reduce((sum, provider) => sum + provider.monthlyValue, 0);

  const showMessage = (label: string) => {
    setActionMessage(label);
    window.setTimeout(() => setActionMessage(''), 2600);
  };

  const handleExtendTrial = async (provider: AdminProviderRecord, days: number) => {
    setPendingProviderId(provider.id);
    setActionError('');
    try {
      const response = await extendProviderTrial(accessToken, provider.id, days);
      mergeProviders([mapAdminProviderDto(response, provider)]);
      await refreshActivity();
      setTrialTarget(null);
      showMessage(t('admin.subscriptions.extendTrialSuccess', { name: provider.name }));
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('admin.subscriptions.extendTrialFailed'));
    } finally {
      setPendingProviderId(null);
    }
  };

  const handleDiscount = async (provider: AdminProviderRecord, percent: number, durationMonths: number) => {
    setPendingProviderId(provider.id);
    setActionError('');
    try {
      const response = await applyProviderDiscount(accessToken, provider.id, percent, durationMonths);
      mergeProviders([mapAdminProviderDto(response, provider)]);
      await refreshActivity();
      setDiscountTarget(null);
      showMessage(t('admin.subscriptions.discountSuccess', { percent, name: provider.name }));
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('admin.subscriptions.discountFailed'));
    } finally {
      setPendingProviderId(null);
    }
  };

  return (
    <div>
      {actionError ? (
        <div style={{ border: `1px solid ${C.roseDark}`, background: 'oklch(0.95 0.04 15)', color: C.roseDark, borderRadius: 10, padding: '11px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div style={{ border: `1px solid ${C.border}`, background: C.bgMuted, color: C.textMedium, borderRadius: 10, padding: '10px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {actionMessage}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 18 }}>
        <KpiCard icon={<CreditCard size={20} />} label={t('admin.dashboard.kpi.mrr')} value={mrr} />
        <KpiCard icon={<Check size={20} />} label={t('admin.subscriptions.kpi.activeSubscriptions')} value={active.length} accent={C.greenLight} iconColor={C.green} />
        <KpiCard icon={<Clock size={20} />} label={t('admin.subscriptions.kpi.inTrial')} value={trial.length} accent={C.tealLight} iconColor={C.tealDark} />
        <KpiCard icon={<AlertCircle size={20} />} label={t('admin.subscriptions.kpi.overdue')} value={overdue.length} accent="oklch(0.95 0.04 15)" iconColor={C.roseDark} />
      </div>
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        {approved.map((provider, index) => (
          <div key={provider.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: index < approved.length - 1 ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap' }}>
            <AdminAvatar provider={provider} size={42} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{provider.name}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{provider.billingPlan === 'main' ? t('admin.subscriptions.planMain') : t('admin.subscriptions.planConnected')} · {provider.city}</div>
            </div>
            <ProviderStatusBadge provider={provider} />
            <BillingBadge provider={provider} />
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, minWidth: 120, textAlign: 'right' }}>
              {provider.monthlyValue ? `${provider.monthlyValue} zł` : '0 zł'}
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button onClick={() => setTrialTarget(provider)} disabled={pendingProviderId === provider.id} style={{ ...adminActionButtonStyle.subtle, opacity: pendingProviderId === provider.id ? 0.6 : 1, cursor: pendingProviderId === provider.id ? 'default' : 'pointer' }}>{t('admin.subscriptions.extendTrialAction')}</button>
              <button onClick={() => setDiscountTarget(provider)} disabled={pendingProviderId === provider.id} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 5, opacity: pendingProviderId === provider.id ? 0.6 : 1, cursor: pendingProviderId === provider.id ? 'default' : 'pointer' }}>
                <Percent size={12} />
                {t('admin.subscriptions.discountAction')}
              </button>
            </div>
          </div>
        ))}
      </Card>
      {trialTarget ? (
        <ExtendTrialModal
          provider={trialTarget}
          onClose={() => setTrialTarget(null)}
          submitting={pendingProviderId === trialTarget.id}
          onConfirm={(days) => void handleExtendTrial(trialTarget, days)}
        />
      ) : null}
      {discountTarget ? (
        <DiscountModal
          provider={discountTarget}
          onClose={() => setDiscountTarget(null)}
          submitting={pendingProviderId === discountTarget.id}
          onConfirm={(percent, durationMonths) => void handleDiscount(discountTarget, percent, durationMonths)}
        />
      ) : null}
    </div>
  );
}
