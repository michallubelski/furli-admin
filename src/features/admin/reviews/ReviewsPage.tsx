import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiClientError } from '../../../shared/api/client';
import { Card, useIsMobile } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_HEAD } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { AlertTriangle, Check, Clock, Eye, EyeOff, MessageSquareWarning, Search, SlidersHorizontal } from '../../../shared/icons';
import { useAdminState } from '../context';
import { adminActionButtonStyle } from '../model';
import { AdminBadge, EmptyState, TabButton } from '../components/shared';
import {
  getReviewDetail,
  getReviewPolicy,
  listReviews,
  MODERATION_CATEGORIES,
  moderateReview,
  REVIEWS_CHANGED_EVENT,
  saveReviewPolicy,
  type AdminReview,
  type AdminReviewDetail,
  type AdminReviewPage,
  type ModerationCategory,
  type ReviewPolicy,
  type ReviewTab,
} from './api';

// "Opinie" (moderation): reported reviews first, oldest waiting first; each review opens with its
// reports and history. A review is hidden only for breaking the rules, with a reason the author is
// told - a negative rating is never one. The time limits of reviews are set here too.

const TABS: ReviewTab[] = ['reported', 'published', 'hidden', 'withdrawn', 'all'];
const PAGE_SIZE = 25;

function paws(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, filled) + '☆☆☆☆☆'.slice(0, 5 - filled);
}

const selectStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, fontSize: 12.5, fontFamily: FONT_BODY, color: C.text };

export function AdminReviewsPage() {
  const { t, formatDate, formatDateTime } = useI18n();
  const { accessToken, showToast } = useAdminState();
  const isMobile = useIsMobile(1100);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ReviewTab>('reported');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [hasReply, setHasReply] = useState<boolean | null>(null);
  const [data, setData] = useState<AdminReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AdminReviewDetail | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const selectedId = params.get('reviewId');

  const errorText = useCallback((failure: unknown, fallback: string) => (failure instanceof ApiClientError ? failure.message : fallback), []);

  const load = useCallback(async (page = 0) => {
    setLoading(true);
    setError('');
    try {
      const result = await listReviews(accessToken, { tab, q: appliedQuery, rating, hasReply, page, size: PAGE_SIZE });
      setData((current) => (page === 0 || !current ? result : { ...result, items: [...current.items, ...result.items] }));
    } catch (failure) {
      setError(errorText(failure, t('admin.reviews.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [accessToken, tab, appliedQuery, rating, hasReply, errorText, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getReviewDetail(accessToken, selectedId)
      .then((result) => { if (!cancelled) setDetail(result); })
      .catch((failure) => { if (!cancelled) showToast(errorText(failure, t('admin.reviews.loadFailed'))); });
    return () => { cancelled = true; };
  }, [accessToken, selectedId, errorText, showToast, t]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('reviewId', id);
    else next.delete('reviewId');
    setParams(next, { replace: true });
  };

  const applyDecision = (result: AdminReviewDetail, message: string) => {
    setDetail(result);
    showToast(message);
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT));
    void load();
  };

  const counts = data?.counts;
  const filters = (
    <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
      <div role="tablist" aria-label={t('admin.reviews.tabsLabel')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((item) => (
          <TabButton key={item} active={tab === item} label={`${t(`admin.reviews.tabs.${item}`)}${counts ? ` (${counts[item]})` : ''}`} onClick={() => setTab(item)} />
        ))}
        <button type="button" onClick={() => setShowPolicy((open) => !open)} aria-expanded={showPolicy} style={{ ...adminActionButtonStyle.subtle, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={14} /> {t('admin.reviews.policy.title')}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={(event) => { event.preventDefault(); setAppliedQuery(query); }} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 240px', border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 10px', background: C.bgCard }}>
          <Search size={14} color={C.textMuted} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onBlur={() => setAppliedQuery(query)} placeholder={t('admin.reviews.searchPlaceholder')} aria-label={t('admin.reviews.searchPlaceholder')} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '9px 0', fontSize: 13, fontFamily: FONT_BODY, color: C.text }} />
        </form>
        <select value={rating ?? ''} onChange={(event) => setRating(event.target.value ? Number(event.target.value) : null)} aria-label={t('admin.reviews.ratingFilter')} style={selectStyle}>
          <option value="">{t('admin.reviews.anyRating')}</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{paws(value)}</option>)}
        </select>
        <select value={hasReply == null ? '' : String(hasReply)} onChange={(event) => setHasReply(event.target.value === '' ? null : event.target.value === 'true')} aria-label={t('admin.reviews.replyFilter')} style={selectStyle}>
          <option value="">{t('admin.reviews.anyReply')}</option>
          <option value="true">{t('admin.reviews.withReply')}</option>
          <option value="false">{t('admin.reviews.withoutReply')}</option>
        </select>
      </div>
    </div>
  );

  const list = (
    <div style={{ display: 'grid', gap: 10 }}>
      {error ? <Card style={{ padding: 14 }}><div role="alert" style={{ color: C.roseDark, fontSize: 13 }}>{error}</div></Card> : null}
      {loading && !data ? <Card style={{ padding: 18, fontSize: 13, color: C.textMuted }}>{t('admin.reviews.loading')}</Card> : null}
      {data && data.items.length === 0 && !loading ? <EmptyState title={t(`admin.reviews.empty.${tab}`)} description={t('admin.reviews.emptyDescription')} /> : null}
      {data?.items.map((review) => (
        <ReviewRow key={review.id} review={review} active={review.id === selectedId} onSelect={() => select(review.id)} formatDate={formatDate} />
      ))}
      {data && data.items.length < data.total ? (
        <button type="button" onClick={() => void load(data.page + 1)} disabled={loading} style={{ ...adminActionButtonStyle.subtle, justifyContent: 'center' }}>{t('admin.reviews.showMore')}</button>
      ) : null}
    </div>
  );

  const detailPanel = detail ? (
    <ReviewDetailPanel
      key={detail.review.id}
      detail={detail}
      formatDate={formatDate}
      formatDateTime={formatDateTime}
      onClose={() => select(null)}
      onAction={async (action, body, message) => {
        try {
          applyDecision(await moderateReview(accessToken, detail.review.id, action, body), message);
          return true;
        } catch (failure) {
          showToast(errorText(failure, t('admin.reviews.actionFailed')));
          return false;
        }
      }}
    />
  ) : (
    <Card style={{ padding: 22, fontSize: 13, color: C.textMuted }}>{t('admin.reviews.selectHint')}</Card>
  );

  return (
    <div>
      {showPolicy ? <PolicyCard onClose={() => setShowPolicy(false)} /> : null}
      {filters}
      {isMobile ? (
        <div style={{ display: 'grid', gap: 14 }}>{detail ? detailPanel : list}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 16, alignItems: 'start' }}>
          {list}
          <div style={{ position: 'sticky', top: 16 }}>{detailPanel}</div>
        </div>
      )}
    </div>
  );
}

function statusBadge(t: (key: string) => string, review: AdminReview) {
  if (review.openReports > 0) return <AdminBadge label={t('admin.reviews.status.reported')} color={C.roseDark} background="oklch(0.95 0.04 15)" />;
  if (review.status === 'HIDDEN') return <AdminBadge label={t('admin.reviews.status.hidden')} color={C.textMuted} background={C.bgMuted} />;
  if (review.status === 'WITHDRAWN') return <AdminBadge label={t('admin.reviews.status.withdrawn')} color={C.textMuted} background={C.bgMuted} />;
  return <AdminBadge label={t('admin.reviews.status.published')} color={C.green} background={C.greenLight} />;
}

function ReviewRow({ review, active, onSelect, formatDate }: { review: AdminReview; active: boolean; onSelect: () => void; formatDate: (value: string) => string }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined} style={{ textAlign: 'left', padding: 14, borderRadius: 14, border: `1px solid ${active ? C.primary : C.border}`, background: active ? 'oklch(0.97 0.03 80)' : C.bgCard, cursor: 'pointer', fontFamily: FONT_BODY, color: C.text, display: 'grid', gap: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: C.primary, letterSpacing: 1 }}>{paws(review.rating)}</span>
        <b style={{ fontSize: 13.5 }}>{review.providerName}</b>
        <span style={{ marginLeft: 'auto' }}>{statusBadge(t, review)}</span>
      </span>
      <span style={{ fontSize: 12, color: C.textMuted }}>{review.author} · {formatDate(review.createdAt)}{review.service ? ` · ${review.service}` : ''}</span>
      {review.text ? <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{review.text}</span> : <span style={{ fontSize: 12.5, color: C.textMuted }}>{t('admin.reviews.noComment')}</span>}
      <span style={{ display: 'flex', gap: 10, fontSize: 11.5, color: C.textMuted, flexWrap: 'wrap' }}>
        {review.openReports > 0 ? <span style={{ color: C.roseDark, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><MessageSquareWarning size={12} /> {t('admin.reviews.openReports', { count: review.openReports })}</span> : null}
        {review.reply ? <span>{review.replyHidden ? t('admin.reviews.replyHiddenShort') : t('admin.reviews.hasReply')}</span> : null}
        {review.staffRating ? <span>{t('admin.reviews.staffShort', { name: review.staffName ?? '' })}</span> : null}
      </span>
    </button>
  );
}

type ActionName = 'keep' | 'hide' | 'restore' | 'reply/hide' | 'reply/restore';

function ReviewDetailPanel({ detail, formatDate, formatDateTime, onClose, onAction }: {
  detail: AdminReviewDetail;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string) => string;
  onClose: () => void;
  onAction: (action: ActionName, body: { category?: ModerationCategory; note?: string } | undefined, message: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { review, reports, history } = detail;
  const [form, setForm] = useState<'hide' | 'reply/hide' | null>(null);
  const [category, setCategory] = useState<ModerationCategory | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const openReports = reports.filter((report) => report.status === 'OPEN');

  const openForm = (kind: 'hide' | 'reply/hide') => {
    setForm(kind);
    setCategory(openReports[0]?.category ?? null);
    setNote('');
    setTried(false);
  };

  const run = async (action: ActionName, body: { category?: ModerationCategory; note?: string } | undefined, message: string) => {
    setBusy(true);
    const done = await onAction(action, body, message);
    setBusy(false);
    if (done) setForm(null);
  };

  const submitForm = () => {
    setTried(true);
    if (!form || !category || !note.trim()) return;
    void run(form, { category, note: note.trim() }, form === 'hide' ? t('admin.reviews.hidden') : t('admin.reviews.replyHiddenToast'));
  };

  const section = { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: C.textMuted, margin: '16px 0 8px' };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEAD, fontSize: 19, fontWeight: 700 }}>{review.providerName}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            {review.author} · {t('admin.reviews.visitOn', { date: formatDate(review.visitDate) })}{review.service ? ` · ${review.service}` : ''}
          </div>
        </div>
        {statusBadge(t, review)}
        <button type="button" onClick={onClose} aria-label={t('common.actions.close')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.textMuted, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={section}>{t('admin.reviews.reviewSection')}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.textMuted }}>
        <span style={{ color: C.primary, fontSize: 15, letterSpacing: 1 }}>{paws(review.rating)}</span>
        {formatDateTime(review.createdAt)}{review.editedAt ? ` · ${t('admin.reviews.edited')}` : ''}
      </div>
      <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{review.text || <span style={{ color: C.textMuted }}>{t('admin.reviews.noComment')}</span>}</p>
      {review.staffRating ? (
        <div style={{ marginTop: 8, border: `1px solid ${C.tealLight}`, borderRadius: 12, padding: '9px 12px', fontSize: 12.5 }}>
          <b>{t('admin.reviews.staffShort', { name: review.staffName ?? '' })}</b> <span style={{ color: C.tealDark }}>{paws(review.staffRating)}</span>
          {review.staffText ? <div style={{ color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{review.staffText}</div> : null}
        </div>
      ) : null}
      {review.status === 'HIDDEN' && review.moderationCategory ? (
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.textSecondary, background: C.bgMuted, borderRadius: 10, padding: '8px 11px' }}>
          <EyeOff size={13} /> {t('admin.reviews.hiddenFor', { reason: t(`admin.reviews.categories.${review.moderationCategory}`) })}{review.moderationNote ? ` — ${review.moderationNote}` : ''}
        </div>
      ) : null}

      {review.reply ? (
        <>
          <div style={section}>{t('admin.reviews.replySection')}</div>
          <div style={{ background: review.replyHidden ? C.bgMuted : C.greenLight, borderRadius: 12, padding: '10px 12px', fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
            {review.replyHidden ? <div style={{ fontSize: 11.5, color: C.roseDark, fontWeight: 700, marginBottom: 4 }}>{t('admin.reviews.replyHiddenFor', { reason: t(`admin.reviews.categories.${review.replyModerationCategory ?? 'OTHER'}`) })}</div> : null}
            {review.reply.text}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{formatDateTime(review.reply.repliedAt)}{review.reply.edited ? ` · ${t('admin.reviews.edited')}` : ''}</div>
          </div>
        </>
      ) : null}

      {reports.length ? (
        <>
          <div style={section}>{t('admin.reviews.reportsSection', { count: reports.length })}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {reports.map((report) => (
              <div key={report.id} style={{ border: `1px solid ${report.status === 'OPEN' ? 'oklch(0.85 0.08 15)' : C.border}`, borderRadius: 12, padding: '9px 12px', fontSize: 12.5 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <b>{t(`admin.reviews.categories.${report.category}`)}</b>
                  <span style={{ color: C.textMuted }}>{report.reporterName ?? '—'} · {formatDateTime(report.createdAt)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: report.status === 'OPEN' ? C.roseDark : C.textMuted }}>{t(`admin.reviews.reportStatus.${report.status}`)}</span>
                </div>
                {report.note ? <div style={{ color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{report.note}</div> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {review.status !== 'WITHDRAWN' ? (
        <>
          <div style={section}>{t('admin.reviews.decisionSection')}</div>
          {form ? (
            <div style={{ display: 'grid', gap: 10, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{form === 'hide' ? t('admin.reviews.hideTitle') : t('admin.reviews.hideReplyTitle')}</div>
              <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: 5 }}>
                <legend style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>{t('admin.reviews.reason')}</legend>
                {MODERATION_CATEGORIES.map((value) => (
                  <label key={value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}>
                    <input type="radio" name="moderation-category" checked={category === value} onChange={() => setCategory(value)} style={{ accentColor: C.primary }} />
                    {t(`admin.reviews.categories.${value}`)}
                  </label>
                ))}
              </fieldset>
              <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>
                {t('admin.reviews.noteLabel')}
                <textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} style={{ border: `1px solid ${tried && !note.trim() ? C.roseDark : C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: FONT_BODY, fontWeight: 400, minHeight: 64, resize: 'vertical' }} />
              </label>
              <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{form === 'hide' ? t('admin.reviews.hideHint') : t('admin.reviews.hideReplyHint')}</div>
              {tried && (!category || !note.trim()) ? <div role="alert" style={{ fontSize: 12, color: C.roseDark }}>{!category ? t('admin.reviews.chooseReason') : t('admin.reviews.noteRequired')}</div> : null}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setForm(null)} style={adminActionButtonStyle.subtle}>{t('common.actions.cancel')}</button>
                <button type="button" onClick={submitForm} disabled={busy} style={{ ...adminActionButtonStyle.danger, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EyeOff size={14} /> {form === 'hide' ? t('admin.reviews.hideAction') : t('admin.reviews.hideReplyAction')}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {openReports.length ? (
                <button type="button" disabled={busy} onClick={() => void run('keep', {}, t('admin.reviews.kept'))} style={{ ...adminActionButtonStyle.success, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={14} /> {t('admin.reviews.keepAction')}</button>
              ) : null}
              {review.status === 'PUBLISHED' ? (
                <button type="button" onClick={() => openForm('hide')} style={{ ...adminActionButtonStyle.danger, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EyeOff size={14} /> {t('admin.reviews.hideAction')}</button>
              ) : null}
              {review.status === 'HIDDEN' ? (
                <button type="button" disabled={busy} onClick={() => void run('restore', undefined, t('admin.reviews.restored'))} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> {t('admin.reviews.restoreAction')}</button>
              ) : null}
              {review.reply && !review.replyHidden ? (
                <button type="button" onClick={() => openForm('reply/hide')} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><EyeOff size={14} /> {t('admin.reviews.hideReplyAction')}</button>
              ) : null}
              {review.reply && review.replyHidden ? (
                <button type="button" disabled={busy} onClick={() => void run('reply/restore', undefined, t('admin.reviews.replyRestored'))} style={{ ...adminActionButtonStyle.subtle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> {t('admin.reviews.restoreReplyAction')}</button>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      <div style={section}>{t('admin.reviews.historySection')}</div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
        {history.map((event, index) => (
          <li key={`${event.type}-${index}`} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: C.textSecondary }}>
            <Clock size={13} color={C.textMuted} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <b>{t(`admin.reviews.events.${event.type}`)}</b>
              {event.actorName ? ` · ${event.actorName}` : ''}
              {event.category ? ` · ${t(`admin.reviews.categories.${event.category}`)}` : ''}
              <span style={{ color: C.textMuted }}> · {formatDateTime(event.createdAt)}</span>
              {event.note ? <span style={{ display: 'block', color: C.textMuted, marginTop: 2 }}>{event.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {review.status === 'PUBLISHED' && review.rating <= 2 && !openReports.length ? (
        <div style={{ marginTop: 14, display: 'flex', gap: 7, fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {t('admin.reviews.negativeIsNotAReason')}
        </div>
      ) : null}
    </Card>
  );
}

function PolicyCard({ onClose }: { onClose: () => void }) {
  const { t, formatDateTime } = useI18n();
  const { accessToken, showToast } = useAdminState();
  const [policy, setPolicy] = useState<ReviewPolicy | null>(null);
  const [write, setWrite] = useState('');
  const [edit, setEdit] = useState('');
  const [reply, setReply] = useState('');
  const [replyUnlimited, setReplyUnlimited] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getReviewPolicy(accessToken).then((loaded) => {
      setPolicy(loaded);
      setWrite(String(loaded.writeWindowDays));
      setEdit(String(loaded.editWindowDays));
      setReplyUnlimited(loaded.replyWindowDays == null);
      setReply(loaded.replyWindowDays == null ? '30' : String(loaded.replyWindowDays));
    }).catch(() => setError(t('admin.reviews.policy.loadFailed')));
  }, [accessToken, t]);

  const number = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN);
  const writeDays = number(write);
  const editDays = number(edit);
  const replyDays = replyUnlimited ? null : number(reply);
  const invalid = !(writeDays >= 1 && writeDays <= 365) ? t('admin.reviews.policy.writeRange')
    : !(editDays >= 0 && editDays <= 365) ? t('admin.reviews.policy.editRange')
      : replyDays !== null && !(replyDays >= 1 && replyDays <= 365) ? t('admin.reviews.policy.replyRange') : '';

  const save = async () => {
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      setPolicy(await saveReviewPolicy(accessToken, { writeWindowDays: writeDays, editWindowDays: editDays, replyWindowDays: replyDays }));
      showToast(t('admin.reviews.policy.saved'));
    } catch (failure) {
      setError(failure instanceof ApiClientError ? failure.message : t('admin.reviews.policy.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, hint: string, value: string, onChange: (value: string) => void, disabled = false) => (
    <label style={{ display: 'grid', gap: 5, fontSize: 12.5, fontWeight: 700 }}>
      {label}
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input inputMode="numeric" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} style={{ width: 90, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: FONT_BODY, background: disabled ? C.bgMuted : C.bgCard }} />
        <span style={{ fontWeight: 500, color: C.textMuted }}>{t('admin.reviews.policy.days')}</span>
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 400, color: C.textMuted, lineHeight: 1.45 }}>{hint}</span>
    </label>
  );

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SlidersHorizontal size={16} color={C.textMedium} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>{t('admin.reviews.policy.title')}</span>
        <button type="button" onClick={onClose} aria-label={t('common.actions.close')} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: C.textMuted, fontSize: 18 }}>×</button>
      </div>
      {!policy && !error ? <div style={{ fontSize: 13, color: C.textMuted }}>{t('admin.reviews.loading')}</div> : null}
      {policy ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {field(t('admin.reviews.policy.write'), t('admin.reviews.policy.writeHint'), write, setWrite)}
          {field(t('admin.reviews.policy.edit'), t('admin.reviews.policy.editHint'), edit, setEdit)}
          <div style={{ display: 'grid', gap: 6 }}>
            {field(t('admin.reviews.policy.reply'), t('admin.reviews.policy.replyHint'), reply, setReply, replyUnlimited)}
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: 'pointer' }}>
              <input type="checkbox" checked={replyUnlimited} onChange={(event) => setReplyUnlimited(event.target.checked)} style={{ accentColor: C.primary }} />
              {t('admin.reviews.policy.replyUnlimited')}
            </label>
          </div>
        </div>
      ) : null}
      {error ? <div role="alert" style={{ fontSize: 12.5, color: C.roseDark, marginTop: 10 }}>{error}</div> : null}
      {policy ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: C.textMuted, flex: 1 }}>{t('admin.reviews.policy.appliesNote')}{policy.updatedAt ? ` ${t('admin.reviews.policy.updatedAt', { date: formatDateTime(policy.updatedAt) })}` : ''}</span>
          <button type="button" onClick={() => void save()} disabled={busy} style={adminActionButtonStyle.primary}>{t('admin.reviews.policy.save')}</button>
        </div>
      ) : null}
    </Card>
  );
}
