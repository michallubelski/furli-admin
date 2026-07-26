import { useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff } from '../../../shared/icons';
import { Card } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useAdminState } from '../context';
import { AdminBadge, EmptyState, TabButton } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminReviewRecord } from '../model';

const TABS: Array<{ id: 'reported' | 'all' | 'hidden'; label: string }> = [
  { id: 'reported', label: 'Zgłoszone' },
  { id: 'all', label: 'Wszystkie' },
  { id: 'hidden', label: 'Ukryte' },
];

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled);
}

function statusMeta(status: AdminReviewRecord['status']) {
  if (status === 'reported') {
    return { label: 'Zgłoszona', color: C.amber, background: C.primaryLight };
  }
  if (status === 'hidden') {
    return { label: 'Ukryta', color: C.roseDark, background: 'oklch(0.95 0.04 15)' };
  }
  return { label: 'Opublikowana', color: C.green, background: C.greenLight };
}

export function AdminReviewsPage() {
  const { reviews, moderateReview } = useAdminState();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('reported');
  const shown = reviews.filter((review) => tab === 'all' || review.status === tab);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((item) => {
          const count = item.id === 'all' ? reviews.length : reviews.filter((review) => review.status === item.id).length;
          return <TabButton key={item.id} active={tab === item.id} label={`${item.label} (${count})`} onClick={() => setTab(item.id)} />;
        })}
      </div>
      {!shown.length ? <EmptyState title="Brak opinii" description="Brak opinii w tej kategorii." /> : null}
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
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>{review.text}</p>
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
                    Ukryj
                  </button>
                ) : (
                  <button onClick={() => moderateReview(review.id, 'published')} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={14} />
                    Przywróć
                  </button>
                )}
                {review.status === 'reported' ? (
                  <button onClick={() => moderateReview(review.id, 'published')} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} />
                    Odrzuć zgłoszenie
                  </button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
