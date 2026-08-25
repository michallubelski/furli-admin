import { useState } from 'react';
import { Gift, Megaphone, Plus, Send } from '../../../shared/icons';
import { Card, inputStyle, SectionTitle } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminBadge, AdminDevNote } from '../components/shared';

export function AdminCommunicationPage() {
  const { t } = useI18n();
  const { broadcasts, referralCodes, addBroadcast, addReferralCode } = useAdminState();
  const [draftTitle, setDraftTitle] = useState('');
  const [audience, setAudience] = useState('all');
  const [channel, setChannel] = useState('email');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Megaphone}>{t('admin.communication.newBroadcastTitle')}</SectionTitle>
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder={t('admin.communication.titlePlaceholder')} style={{ ...inputStyle, marginBottom: 10, background: C.bgCard }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select value={audience} onChange={(event) => setAudience(event.target.value)} style={{ ...inputStyle, background: C.bgCard }}>
              <option value="all">{t('admin.communication.audienceAll')}</option>
              <option value="trial">{t('admin.communication.audienceTrial')}</option>
              <option value="veterinarian">{t('admin.communication.audienceVets')}</option>
              <option value="groomer">{t('admin.communication.audienceGroomers')}</option>
            </select>
            <select value={channel} onChange={(event) => setChannel(event.target.value)} style={{ ...inputStyle, background: C.bgCard }}>
              <option value="email">{t('admin.communication.channelEmail')}</option>
              <option value="notification">{t('admin.communication.channelNotification')}</option>
              <option value="banner">{t('admin.communication.channelBanner')}</option>
            </select>
          </div>
          <button disabled={!draftTitle.trim()} onClick={() => { void addBroadcast(draftTitle, audience, channel); setDraftTitle(''); }} style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: draftTitle.trim() ? C.primary : C.bgMuted, color: draftTitle.trim() ? '#fff' : C.textMuted, fontSize: 13, fontWeight: 700, cursor: draftTitle.trim() ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Send size={15} />
            {t('admin.communication.sendAction')}
          </button>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMedium, marginBottom: 8 }}>{t('admin.communication.sentLabel')}</div>
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{broadcast.title}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{broadcast.audience} · {broadcast.channel} · {broadcast.sentAt}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle
            Icon={Gift}
            right={<button onClick={() => void addReferralCode()} style={{ fontSize: 12, fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> {t('admin.communication.addCodeAction')}</button>}
          >
            {t('admin.communication.codesTitle')}
          </SectionTitle>
          {referralCodes.map((code) => (
            <div key={code.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'monospace' }}>{code.code}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{code.discountLabel} · {t('admin.communication.usesLabel', { uses: code.uses, max: code.maxUses })}</div>
              </div>
              <AdminBadge label={t(code.active ? 'admin.communication.statusActive' : 'admin.communication.statusExpired')} color={code.active ? C.green : C.textMuted} background={code.active ? C.greenLight : C.bgMuted} />
            </div>
          ))}
        </Card>
      </div>
      <AdminDevNote>{t('admin.communication.devNote')}</AdminDevNote>
    </div>
  );
}
