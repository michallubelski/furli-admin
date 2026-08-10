import { useMemo, useState } from 'react';
import { Check, MessageSquare, MessageSquareWarning, ShieldCheck } from '../../../shared/icons';
import { Card, DevNote } from '../../../shared/components/ui';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminAvatar, AdminLinkButton, EmptyState } from '../components/shared';
import type { AdminProviderRecord, AdminReportRecord, AdminReviewRecord } from '../model';
import { adminActionButtonStyle, providerTypeLabel } from '../model';
import { approveProvider, mapAdminProviderDto } from '../api';
import { ApiClientError } from '../../../shared/api/client';
import type { IconComponent } from '../../../shared/types/furli';

type QueueKind = 'verification' | 'review' | 'report';
type QueueFilter = 'all' | QueueKind;

interface QueueItem {
  id: string;
  kind: QueueKind;
  refId: string;
  title: string;
  sub: string;
  meta: string;
  urgent: boolean;
  warning?: string;
}

// Matches the mockup's QKIND styling map - `review`'s color has no dedicated theme token in this
// app either (the mockup itself falls back to a literal oklch value for it), so it's used as-is.
const KIND_STYLE: Record<QueueKind, { color: string; bg: string; Icon: IconComponent }> = {
  verification: { color: C.amber, bg: 'oklch(0.96 0.04 75)', Icon: ShieldCheck },
  review: { color: 'oklch(0.55 0.14 300)', bg: 'oklch(0.93 0.05 300)', Icon: MessageSquare },
  report: { color: C.roseDark, bg: 'oklch(0.95 0.04 15)', Icon: MessageSquareWarning },
};

// A verification item is urgent when it's a brand-new submission (not yet-actioned changes);
// reviews/reports are urgent when their own text signals something more serious than routine
// moderation - ported verbatim from the mockup's regex heuristics.
const URGENT_REVIEW_PATTERN = /użytkownik|wulgar/i;
const URGENT_REPORT_PATTERN = /spór|no-show/i;

function buildItems(t: (key: string, values?: Record<string, string | number>) => string, providers: AdminProviderRecord[], reviews: AdminReviewRecord[], reports: AdminReportRecord[]): QueueItem[] {
  const items: QueueItem[] = [];
  for (const provider of providers) {
    if (provider.verificationStatus !== 'pending' && provider.verificationStatus !== 'changes_requested') {
      continue;
    }
    items.push({
      id: `v_${provider.id}`,
      kind: 'verification',
      refId: provider.id,
      title: provider.name,
      sub: `${providerTypeLabel(t, provider.typeLabel)} · ${provider.city}`,
      meta: provider.verificationStatus === 'changes_requested' ? t('admin.queue.metaAwaitingChanges') : t('admin.queue.metaNewSubmission'),
      urgent: provider.verificationStatus === 'pending',
    });
  }
  for (const review of reviews) {
    if (review.status !== 'reported') {
      continue;
    }
    items.push({
      id: `r_${review.id}`,
      kind: 'review',
      refId: review.id,
      title: t('admin.queue.reviewTitle', { rating: review.rating, provider: review.providerName }),
      sub: review.text,
      meta: review.date,
      urgent: URGENT_REVIEW_PATTERN.test(review.reason || ''),
      warning: review.reason,
    });
  }
  for (const report of reports) {
    if (report.status !== 'open') {
      continue;
    }
    items.push({
      id: `z_${report.id}`,
      kind: 'report',
      refId: report.id,
      title: t('admin.queue.reportTitle', { type: report.type, subject: report.subject }),
      sub: report.detail,
      meta: `${report.reporter} · ${report.openedAt}`,
      urgent: URGENT_REPORT_PATTERN.test(report.type || ''),
    });
  }
  return items.sort((left, right) => Number(right.urgent) - Number(left.urgent));
}

function filterButtonStyle(active: boolean, color?: string): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT_BODY,
    border: `1px solid ${active ? (color || C.primary) : C.border}`,
    background: active ? (color || C.primary) : C.bgCard,
    color: active ? '#fff' : C.textMedium,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };
}

export function AdminQueuePage() {
  const { t } = useI18n();
  const { providers, reviews, reports, accessToken, mergeProviders, refreshPendingVerificationCount, refreshActivity, moderateReview, resolveReport, showToast } = useAdminState();
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const items = useMemo(() => buildItems(t, providers, reviews, reports), [t, providers, reviews, reports]);
  const countOf = (kind: QueueKind) => items.filter((item) => item.kind === kind).length;
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);

  const handleApprove = async (item: QueueItem) => {
    setApprovingId(item.id);
    setError('');
    try {
      const provider = providers.find((entry) => entry.id === item.refId);
      const response = await approveProvider(accessToken, item.refId);
      mergeProviders([mapAdminProviderDto(response, provider)]);
      await refreshPendingVerificationCount();
      await refreshActivity();
      showToast(t('admin.verification.approvedMessage', { name: provider?.name || item.title }));
    } catch (nextError) {
      setError(nextError instanceof ApiClientError ? nextError.message : t('admin.verification.approveFailed'));
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div>
      {error ? (
        <div style={{ border: `1px solid ${C.roseDark}`, background: 'oklch(0.95 0.04 15)', color: C.roseDark, borderRadius: 10, padding: '11px 13px', fontSize: 12.5, fontWeight: 700, marginBottom: 14 }}>
          {error}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={filterButtonStyle(filter === 'all')}>{t('admin.queue.filterAll', { count: items.length })}</button>
        <button onClick={() => setFilter('verification')} style={filterButtonStyle(filter === 'verification', KIND_STYLE.verification.color)}>{t('admin.queue.filterVerification', { count: countOf('verification') })}</button>
        <button onClick={() => setFilter('review')} style={filterButtonStyle(filter === 'review', KIND_STYLE.review.color)}>{t('admin.queue.filterReview', { count: countOf('review') })}</button>
        <button onClick={() => setFilter('report')} style={filterButtonStyle(filter === 'report', KIND_STYLE.report.color)}>{t('admin.queue.filterReport', { count: countOf('report') })}</button>
      </div>

      {!shown.length ? <EmptyState title={t('admin.queue.emptyTitle')} description="" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map((item) => {
            const kindStyle = KIND_STYLE[item.kind];
            const provider = item.kind === 'verification' ? providers.find((entry) => entry.id === item.refId) : undefined;
            return (
              <Card key={item.id} style={{ padding: 18, borderLeft: `3px solid ${kindStyle.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, color: kindStyle.color, background: kindStyle.bg, borderRadius: 999, padding: '4px 10px' }}>
                    <kindStyle.Icon size={12} /> {t(`admin.queue.kind${item.kind === 'verification' ? 'Verification' : item.kind === 'review' ? 'Review' : 'Report'}`)}
                  </span>
                  {item.urgent ? <span style={{ fontSize: 10.5, fontWeight: 800, color: C.roseDark, background: 'oklch(0.95 0.04 15)', borderRadius: 999, padding: '4px 10px' }}>{t('admin.queue.urgentBadge')}</span> : null}
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.textMuted }}>{item.meta}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {provider ? <AdminAvatar provider={provider} size={34} /> : null}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{item.title}</div>
                    <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{item.sub}</div>
                  </div>
                </div>
                {item.warning ? <div style={{ fontSize: 11.5, color: C.roseDark, marginTop: 7 }}>⚠ {item.warning}</div> : null}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {item.kind === 'verification' ? (
                    <>
                      <button disabled={approvingId === item.id} onClick={() => void handleApprove(item)} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: approvingId === item.id ? 0.65 : 1 }}>
                        <Check size={14} /> {t('common.actions.approve')}
                      </button>
                      <AdminLinkButton to={`/providers?providerId=${item.refId}`}>{t('admin.queue.detailsAndDecision')}</AdminLinkButton>
                    </>
                  ) : null}
                  {item.kind === 'review' ? (
                    <>
                      <button onClick={() => moderateReview(item.refId, 'hidden')} style={adminActionButtonStyle.danger}>{t('admin.queue.hideReview')}</button>
                      <button onClick={() => moderateReview(item.refId, 'published')} style={adminActionButtonStyle.success}>{t('admin.queue.dismissReport')}</button>
                    </>
                  ) : null}
                  {item.kind === 'report' ? (
                    <button onClick={() => resolveReport(item.refId)} style={adminActionButtonStyle.success}>{t('admin.queue.resolveReport')}</button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <DevNote>{t('admin.queue.devNote')}</DevNote>
    </div>
  );
}
