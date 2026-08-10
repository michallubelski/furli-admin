import { Activity, Check, Database, Lock, Users, X } from '../../../shared/icons';
import { Card, SectionTitle } from '../../../shared/components/ui';
import { C, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminBadge, AdminDevNote } from '../components/shared';

export function AdminAdminsPage() {
  const { t } = useI18n();
  const { admins, audit, gdprRequests, resolveGdprRequest } = useAdminState();

  const ROLE_PERMS = {
    perms: [t('admin.admins.permVerification'), t('admin.admins.permProviders'), t('admin.admins.permFinance'), t('admin.admins.permModeration'), t('admin.admins.permConfig'), t('admin.admins.permAdmins')],
    roles: [
      { role: 'Owner', has: [true, true, true, true, true, true] },
      { role: 'Weryfikator', has: [true, true, false, false, false, false] },
      { role: 'Support', has: [false, true, false, true, false, false] },
      { role: 'Finanse', has: [false, true, true, false, false, false] },
    ],
  };

  const auditAll = [
    ...audit,
    { id: 'local_audit_login', action: t('admin.admins.auditLoginAction'), target: t('admin.admins.auditLoginTarget'), actor: '', timestamp: t('admin.admins.todayAt') },
    { id: 'local_audit_flag', action: t('admin.admins.auditFlagAction'), target: t('admin.admins.auditFlagTarget'), actor: '', timestamp: t('admin.admins.yesterday') },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Users}>{t('admin.admins.adminsTitle')}</SectionTitle>
          {admins.map((admin) => (
            <div key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium, fontWeight: 700, fontFamily: FONT_NUM, fontSize: 13 }}>
                {admin.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{admin.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{admin.email}</div>
              </div>
              <AdminBadge label={admin.roleLabel} color={C.tealDark} background={C.tealLight} />
              <span style={{ fontSize: 11, color: admin.presenceLabel === 'online' ? C.green : C.textMuted, fontWeight: 600 }}>{admin.presenceLabel || admin.lastSeen}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Lock}>{t('admin.admins.rbacTitle')}</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: C.textMuted, fontWeight: 700 }}>{t('admin.admins.roleColumn')}</th>
                  {ROLE_PERMS.perms.map((permission) => <th key={permission} style={{ padding: '6px 4px', color: C.textMuted, fontWeight: 700, fontSize: 10 }}>{permission}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROLE_PERMS.roles.map((role) => (
                  <tr key={role.role} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{role.role}</td>
                    {role.has.map((enabled, index) => <td key={`${role.role}-${index}`} style={{ textAlign: 'center', padding: '8px 4px' }}>{enabled ? <Check size={14} color={C.green} /> : <X size={13} color={C.border} />}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Activity}>{t('admin.admins.auditLogTitle')}</SectionTitle>
          {auditAll.slice(0, 8).map((entry, index) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: index < 7 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color || C.tealDark, marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: C.text }}><b>{entry.action}</b> — {entry.target} <span style={{ color: C.textMuted, fontSize: 11 }}>· {entry.timestamp}</span></div>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Database}>{t('admin.admins.gdprTitle')}</SectionTitle>
          {!gdprRequests.length ? <p style={{ fontSize: 12.5, color: C.textMuted }}>{t('admin.admins.gdprEmpty')}</p> : null}
          {gdprRequests.map((request) => (
            <div key={request.id} style={{ padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{request.type}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{request.subject} · {request.openedAt}</div>
                </div>
                <button onClick={() => resolveGdprRequest(request.id)} style={{ padding: '6px 11px', borderRadius: 9, border: 'none', background: C.tealDark, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{t('admin.admins.fulfillAction')}</button>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <AdminDevNote>{t('admin.admins.devNote')}</AdminDevNote>
    </div>
  );
}
