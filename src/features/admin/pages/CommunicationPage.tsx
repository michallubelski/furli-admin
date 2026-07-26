import { useState } from 'react';
import { Gift, Megaphone, Plus, Send } from '../../../shared/icons';
import { Card, inputStyle, SectionTitle } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useAdminState } from '../context';
import { AdminBadge, AdminDevNote } from '../components/shared';

export function AdminCommunicationPage() {
  const { broadcasts, referralCodes, addBroadcast, addReferralCode } = useAdminState();
  const [draftTitle, setDraftTitle] = useState('');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Megaphone}>Nowe ogłoszenie</SectionTitle>
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Tytuł ogłoszenia…" style={{ ...inputStyle, marginBottom: 10, background: C.bgCard }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select style={{ ...inputStyle, background: C.bgCard }}><option>Wszystkie placówki</option><option>Tylko trial</option><option>Weterynarze</option><option>Groomerzy</option></select>
            <select style={{ ...inputStyle, background: C.bgCard }}><option>E-mail</option><option>Powiadomienie</option><option>Baner w panelu</option></select>
          </div>
          <button onClick={() => { addBroadcast(draftTitle); setDraftTitle(''); }} style={{ padding: '11px 18px', borderRadius: 11, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Send size={15} />
            Wyślij (demo)
          </button>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMedium, marginBottom: 8 }}>Wysłane</div>
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
            right={<button onClick={() => addReferralCode()} style={{ fontSize: 12, fontWeight: 700, color: C.amber, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Dodaj kod</button>}
          >
            Kody polecające / promocje
          </SectionTitle>
          {referralCodes.map((code) => (
            <div key={code.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'monospace' }}>{code.code}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{code.discountLabel} · {code.uses}/{code.maxUses} użyć</div>
              </div>
              <AdminBadge label={code.active ? 'Aktywny' : 'Wygasły'} color={code.active ? C.green : C.textMuted} background={code.active ? C.greenLight : C.bgMuted} />
            </div>
          ))}
        </Card>
      </div>
      <AdminDevNote>
        TODO [backend]: wysyłka kampanii (e-mail/push/in-app), segmentacja odbiorców, generowanie i rozliczanie kodów polecających, statystyki otwarć/konwersji.
      </AdminDevNote>
    </div>
  );
}
