import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff } from '../../../shared/icons';
import { Card, DevNote } from '../../../shared/components/ui';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminBadge, EmptyState, TabButton } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminReviewRecord } from '../model';

type ReviewTab = 'reported' | 'all' | 'hidden';
type ReviewDimension = 'all' | 'staff';

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled);
}

function dimensionButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 14px',
    borderRadius: 10,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: FONT_BODY,
    border: `1px solid ${active ? C.tealDark : C.border}`,
    background: active ? C.tealLight : C.bgCard,
    color: active ? C.tealDark : C.textMedium,
  };
}

export function AdminReviewsPage() {
  const { t } = useI18n();
  const { reviews, moderateReview } = useAdminState();
  const [tab, setTab] = useState<ReviewTab>('reported');
  const [dimension, setDimension] = useState<ReviewDimension>('all');

  const TABS: Array<{ id: ReviewTab; label: string }> = [
    { id: 'reported', label: t('admin.reviews.tabReported') },
    { id: 'all', label: t('admin.reviews.tabAll') },
    { id: 'hidden', label: t('admin.reviews.tabHidden') },
  ];

  const statusMeta = (status: AdminReviewRecord['status']) => {
    if (status === 'reported') {
      return { label: t('admin.reviews.statusReported'), color: C.roseDark, background: 'oklch(0.95 0.04 15)' };
    }
    if (status === 'hidden') {
      return { label: t('admin.reviews.statusHidden'), color: C.textMuted, background: C.bgMuted };
    }
    return { label: t('admin.reviews.statusPublished'), color: C.green, background: C.greenLight };
  };

  const staffCount = useMemo(() => reviews.filter((review) => review.staffRating != null).length, [reviews]);
  const shown = useMemo(() => {
    let result = reviews.filter((review) => tab === 'all' || review.status === tab);
    if (dimension === 'staff') {
      result = result.filter((review) => review.staffRating != null);
    }
    return result;
  }, [reviews, tab, dimension]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {TABS.map((item) => {
          const count = item.id === 'all' ? reviews.length : reviews.filter((review) => review.status === item.id).length;
          return <TabButton key={item.id} active={tab === item.id} label={`${item.label} (${count})`} onClick={() => setTab(item.id)} />;
        })}
        <span style={{ width: 1, alignSelf: 'stretch', background: C.border, margin: '0 4px' }} />
        <button onClick={() => setDimension('all')} style={dimensionButtonStyle(dimension === 'all')}>{t('admin.reviews.dimensionAll')}</button>
        <button onClick={() => setDimension('staff')} style={dimensionButtonStyle(dimension === 'staff')}>{t('admin.reviews.dimensionStaff', { count: staffCount })}</button>
      </div>
      {!shown.length ? <EmptyState title={t('admin.reviews.emptyTitle')} description={t('admin.reviews.emptyDescription')} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map((review) => {
          const meta = statusMeta(review.status);
          return (
            <Card key={review.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{review.author}</span>
                  <span style={{ fontSize: 12, color: C.textMuted }}> · {review.providerName} · {review.date}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: C.primary, fontSize: 14, letterSpacing: 1 }}>{stars(review.rating)}</span>
                  <AdminBadge label={meta.label} color={meta.color} background={meta.background} />
                </div>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('admin.reviews.facilityRatingLabel')}</div>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>{review.text || <span style={{ color: C.textMuted }}>{t('admin.reviews.noComment')}</span>}</p>
              {review.staffRating != null ? (
                <div style={{ marginTop: 10, border: `1px solid ${C.tealLight}`, background: 'oklch(0.98 0.02 180 / 0.5)', borderRadius: 12, padding: '10px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: C.tealDark, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('admin.reviews.staffRatingLabel')}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{review.staffName || '—'}</span>
                    <span style={{ marginLeft: 'auto', color: C.tealDark, fontSize: 13.5, letterSpacing: 1 }}>{stars(review.staffRating)}</span>
                  </div>
                  {review.staffText ? <p style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>{review.staffText}</p> : null}
                  {review.staffReply ? <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 6 }}><b>{t('admin.reviews.staffReplyPrefix')}</b> {review.staffReply}</p> : null}
                </div>
              ) : null}
              {review.status === 'reported' && review.reason ? (
                <div style={{ fontSize: 11.5, color: C.roseDark, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={13} />
                  {review.reason}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
                {review.status !== 'hidden' ? (
                  <button onClick={() => moderateReview(review.id, 'hidden')} style={{ ...adminActionButtonStyle.danger, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <EyeOff size={14} />
                    {t('admin.reviews.hideAction')}
                  </button>
                ) : (
                  <button onClick={() => moderateReview(review.id, 'published')} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={14} />
                    {t('admin.reviews.restoreAction')}
                  </button>
                )}
                {review.status === 'reported' ? (
                  <button onClick={() => moderateReview(review.id, 'published')} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} />
                    {t('admin.reviews.dismissReportAction')}
                  </button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      <DevNote>{t('admin.reviews.devNote')}</DevNote>
    </div>
  );
}
