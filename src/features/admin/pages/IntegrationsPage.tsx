import { Plug } from '../../../shared/icons';
import { Card, DevNote } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminBadge, EmptyState } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminIntegrationRecord } from '../model';

export function AdminIntegrationsPage() {
  const { t } = useI18n();
  const { integrations, setIntegrationStatus } = useAdminState();

  const statusMeta = (status: AdminIntegrationRecord['status']) => {
    if (status === 'active') {
      return { label: t('admin.integrations.statusActive'), color: C.green, background: C.greenLight };
    }
    if (status === 'pending') {
      return { label: t('admin.integrations.statusPending'), color: C.amber, background: 'oklch(0.95 0.06 75)' };
    }
    return { label: t('admin.integrations.statusRevoked'), color: C.roseDark, background: 'oklch(0.95 0.04 15)' };
  };

  if (!integrations.length) {
    return <EmptyState title={t('admin.integrations.emptyTitle')} description={t('admin.integrations.emptyDescription')} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {integrations.map((integration) => {
          const meta = statusMeta(integration.status);
          const scopes = integration.scope.split(',').map((scope) => scope.trim()).filter(Boolean);
          return (
            <Card key={integration.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: C.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plug size={18} color={C.tealDark} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{integration.providerName}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: 'monospace' }}>{integration.clientId} · {integration.env}</div>
                </div>
                <AdminBadge label={meta.label} color={meta.color} background={meta.background} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: integration.webhookOk ? C.green : C.roseDark }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: integration.webhookOk ? C.green : C.roseDark }} />
                  {t(integration.webhookOk ? 'admin.integrations.webhookOk' : 'admin.integrations.webhookError')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {scopes.map((scope) => (
                  <span key={scope} style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: C.tealDark, background: C.tealLight, borderRadius: 999, padding: '3px 9px' }}>{scope}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: C.textMuted }}>{t('admin.integrations.lastEventLabel')}: {integration.lastEvent}</span>
                <div style={{ display: 'flex', gap: 7 }}>
                  {integration.status === 'pending' ? <button onClick={() => setIntegrationStatus(integration.id, 'active')} style={adminActionButtonStyle.success}>{t('admin.integrations.approveAction')}</button> : null}
                  {integration.status !== 'revoked' ? <button onClick={() => setIntegrationStatus(integration.id, 'revoked')} style={adminActionButtonStyle.danger}>{t('admin.integrations.revokeAction')}</button> : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <DevNote>{t('admin.integrations.devNote')}</DevNote>
    </div>
  );
}
