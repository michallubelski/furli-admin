import { useState } from 'react';
import { MessageSquareWarning } from '../../../shared/icons';
import { Card, DevNote } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminBadge, EmptyState, TabButton } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminReportRecord } from '../model';

type ReportTab = 'open' | 'all' | 'resolved';

export function AdminReportsPage() {
  const { t } = useI18n();
  const { reports, resolveReport } = useAdminState();
  const [tab, setTab] = useState<ReportTab>('open');
  // "investigating" counts as still-open for this tab (same as the row rendering below already
  // treats it, via `isOpen`) - otherwise a report moved to "investigating" falls out of both this
  // tab and the Queue's own open-filter, effectively disappearing from every active work surface.
  const shown = reports.filter((report) => tab === 'all' || (tab === 'open' ? report.status !== 'resolved' : report.status === tab));

  const TABS: Array<{ id: ReportTab; label: string }> = [
    { id: 'open', label: t('admin.reports.tabOpen') },
    { id: 'all', label: t('admin.reports.tabAll') },
    { id: 'resolved', label: t('admin.reports.tabResolved') },
  ];

  const statusMeta = (status: AdminReportRecord['status']) => {
    if (status === 'resolved') {
      return { label: t('admin.reports.statusResolved'), color: C.green, background: C.greenLight };
    }
    if (status === 'investigating') {
      return { label: t('admin.reports.statusInvestigating'), color: C.tealDark, background: C.tealLight };
    }
    return { label: t('admin.reports.statusOpen'), color: C.amber, background: 'oklch(0.95 0.06 75)' };
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((item) => <TabButton key={item.id} active={tab === item.id} label={item.label} onClick={() => setTab(item.id)} />)}
      </div>
      {!shown.length ? <EmptyState title={t('admin.reports.emptyTitle')} description={t('admin.reports.emptyDescription')} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map((report) => {
          const meta = statusMeta(report.status);
          const isOpen = report.status !== 'resolved';
          return (
            <Card key={report.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: isOpen ? 'oklch(0.95 0.06 75)' : C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MessageSquareWarning size={18} color={isOpen ? C.amber : C.green} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{report.type}</span>
                    <AdminBadge label={meta.label} color={meta.color} background={meta.background} />
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, margin: '3px 0' }}>
                    {t('admin.reports.concernsPrefix')} <b style={{ color: C.textSecondary }}>{report.providerName}</b> · {report.reporter} · {report.openedAt} · {t('admin.reports.priorityLabel')}: {report.priority}
                  </div>
                  <p style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>{report.detail}</p>
                </div>
                {isOpen ? (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <button onClick={() => resolveReport(report.id)} style={adminActionButtonStyle.success}>{t('admin.reports.resolveAction')}</button>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      <DevNote>{t('admin.reports.devNote')}</DevNote>
    </div>
  );
}
