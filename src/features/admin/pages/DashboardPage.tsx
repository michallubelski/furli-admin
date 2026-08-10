import { Link } from 'react-router-dom';
import { Clock, CreditCard, Store, TrendingUp } from '../../../shared/icons';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { activityActionColor, activityActionLabel, providerTypeLabel } from '../model';
import { AdminAvatar, KpiCard, ProviderStatusBadge, ScreenCard, SectionLinkButton, subtleSmallButtonStyle } from '../components/shared';

export function AdminDashboardPage() {
  const { t } = useI18n();
  const { providers, activity, pendingVerificationCount } = useAdminState();
  const activeProviders = providers.filter((provider) => provider.verificationStatus === 'approved' && !provider.suspended);
  const newThisWeek = providers.filter((provider) => provider.ageDays <= 7).length;
  const monthlyRevenue = activeProviders.reduce((sum, provider) => sum + provider.monthlyValue, 0);
  const pendingProviders = providers.filter((provider) => provider.verificationStatus === 'pending' || provider.verificationStatus === 'changes_requested');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 18 }}>
        <KpiCard icon={<Clock size={20} />} label={t('admin.dashboard.kpi.pendingVerifications')} value={pendingVerificationCount} />
        <KpiCard icon={<Store size={20} />} label={t('admin.dashboard.kpi.activeProviders')} value={activeProviders.length} accent={C.greenLight} iconColor={C.green} />
        <KpiCard icon={<TrendingUp size={20} />} label={t('admin.dashboard.kpi.newThisWeek')} value={newThisWeek} accent={C.tealLight} iconColor={C.tealDark} />
        <KpiCard icon={<CreditCard size={20} />} label={t('admin.dashboard.kpi.mrr')} value={monthlyRevenue} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        <ScreenCard title={t('admin.dashboard.toReview.title')} right={<SectionLinkButton to="/queue" label={t('admin.dashboard.toReview.allQueue')} />}>
          {!pendingProviders.length ? <p style={{ fontSize: 13, color: C.textMuted }}>{t('admin.dashboard.toReview.empty')}</p> : null}
          {pendingProviders.slice(0, 4).map((provider, index) => (
            <div key={provider.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: index < Math.min(pendingProviders.length, 4) - 1 ? `1px solid ${C.border}` : 'none' }}>
              <AdminAvatar provider={provider} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{provider.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{providerTypeLabel(t, provider.typeLabel)} · {provider.city} · {provider.submittedAt}</div>
              </div>
              <ProviderStatusBadge provider={provider} />
              <Link to={`/providers?providerId=${provider.id}`} style={{ ...subtleSmallButtonStyle, textDecoration: 'none' }}>{t('admin.actions.review')}</Link>
            </div>
          ))}
        </ScreenCard>
        <ScreenCard title={t('admin.dashboard.recentActivity.title')}>
          {!activity.length ? <p style={{ fontSize: 13, color: C.textMuted }}>{t('admin.dashboard.recentActivity.empty')}</p> : null}
          {activity.slice(0, 7).map((entry, index) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: index < Math.min(activity.length, 7) - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: activityActionColor(entry.action), marginTop: 6, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.text }}><b>{activityActionLabel(t, entry.action)}</b> — {entry.providerName}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{entry.createdAt}</div>
              </div>
            </div>
          ))}
        </ScreenCard>
      </div>
    </div>
  );
}
