import { Plug } from '../../../shared/icons';
import { Card } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useAdminState } from '../context';
import { AdminBadge, EmptyState } from '../components/shared';
import { adminActionButtonStyle } from '../model';
import type { AdminIntegrationRecord } from '../model';

function statusMeta(status: AdminIntegrationRecord['status']) {
  if (status === 'active') {
    return { label: 'Aktywny', color: C.green, background: C.greenLight };
  }
  if (status === 'pending') {
    return { label: 'Oczekuje na akceptację', color: C.amber, background: 'oklch(0.95 0.06 75)' };
  }
  return { label: 'Odwołany', color: C.roseDark, background: 'oklch(0.95 0.04 15)' };
}

export function AdminIntegrationsPage() {
  const { integrations, setIntegrationStatus } = useAdminState();

  if (!integrations.length) {
    return <EmptyState title="Brak integracji" description="Żadna placówka nie ma jeszcze skonfigurowanego dostępu API." />;
  }

  return (
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
                <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: 'monospace' }}>{integration.systemName}</div>
              </div>
              <AdminBadge label={meta.label} color={meta.color} background={meta.background} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {scopes.map((scope) => (
                <span key={scope} style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: C.tealDark, background: C.tealLight, borderRadius: 999, padding: '3px 9px' }}>{scope}</span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: C.textMuted }}>Ostatnia synchronizacja: {integration.lastSync}</span>
              <div style={{ display: 'flex', gap: 7 }}>
                {integration.status === 'pending' ? <button onClick={() => setIntegrationStatus(integration.id, 'active')} style={adminActionButtonStyle.success}>Zatwierdź dostęp</button> : null}
                {integration.status !== 'revoked' ? <button onClick={() => setIntegrationStatus(integration.id, 'revoked')} style={adminActionButtonStyle.danger}>Odwołaj klucz</button> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
