import { useState } from 'react';
import { CreditCard, FileText, MapPin, SlidersHorizontal, Tag } from '../../../shared/icons';
import { Card, SectionTitle, WizToggle } from '../../../shared/components/ui';
import { C } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { AdminDevNote } from '../components/shared';

const SPECIALIZATIONS = ['Chirurgia', 'Dermatologia', 'Stomatologia', 'Behawiorystyka', 'Strzyżenie', 'Trymowanie', 'Hotel', 'Spacery'];
const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Gdańsk', 'Poznań', 'Łódź', 'Katowice'];
const LEGAL_DOCS = [
  { name: 'Regulamin placówek', version: '2.3', date: '01.05.2026' },
  { name: 'Polityka prywatności (RODO)', version: '1.7', date: '01.05.2026' },
  { name: 'Umowa powierzenia danych', version: '1.1', date: '12.02.2026' },
];

export function AdminSettingsPage() {
  const { t } = useI18n();
  const { plans, featureFlags, toggleFeatureFlag, logAudit } = useAdminState();
  const [actionMessage, setActionMessage] = useState('');

  const runDemoAction = (label: string, target: string) => {
    setActionMessage(`${label} (demo)`);
    logAudit(label, target);
    window.setTimeout(() => setActionMessage(''), 2600);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      {actionMessage ? (
        <div style={{ gridColumn: '1 / -1', border: `1px solid ${C.border}`, background: C.bgMuted, color: C.textMedium, borderRadius: 10, padding: '10px 13px', fontSize: 12.5, fontWeight: 700 }}>
          {actionMessage}
        </div>
      ) : null}
      <Card style={{ padding: 22 }}>
        <SectionTitle Icon={CreditCard}>{t('admin.config.plansTitle')}</SectionTitle>
        {plans.map((plan) => (
          <div key={plan.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{plan.name}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: 'monospace' }}>{plan.id}</div>
            </div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>{plan.price}</span>
            <button onClick={() => runDemoAction(t('admin.config.planPriceChanged'), plan.name)} style={{ padding: '6px 11px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{t('admin.config.editAction')}</button>
          </div>
        ))}
      </Card>
      <Card style={{ padding: 22 }}>
        <SectionTitle Icon={SlidersHorizontal}>{t('admin.config.flagsTitle')}</SectionTitle>
        {featureFlags.map((flag) => (
          <div key={flag.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{flag.label}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>{flag.description}</div>
            </div>
            <WizToggle on={flag.enabled} onClick={() => toggleFeatureFlag(flag.id)} />
          </div>
        ))}
      </Card>
      <Card style={{ padding: 22 }}>
        <SectionTitle Icon={Tag}>{t('admin.config.taxonomyTitle')}</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{SPECIALIZATIONS.map((item) => <span key={item} style={{ fontSize: 12, fontWeight: 600, color: C.textMedium, background: C.bgMuted, borderRadius: 999, padding: '6px 12px' }}>{item}</span>)}</div>
        <SectionTitle Icon={MapPin}><span style={{ marginTop: 8, display: 'inline-block' }}>{t('admin.config.citiesTitle')}</span></SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{CITIES.map((item) => <span key={item} style={{ fontSize: 12, fontWeight: 600, color: C.tealDark, background: C.tealLight, borderRadius: 999, padding: '6px 12px' }}>{item}</span>)}</div>
      </Card>
      <Card style={{ padding: 22 }}>
        <SectionTitle Icon={FileText}>{t('admin.config.legalDocsTitle')}</SectionTitle>
        {LEGAL_DOCS.map((document) => (
          <div key={document.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
            <FileText size={16} color={C.textMuted} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{document.name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{t('admin.config.versionLabel', { version: document.version, date: document.date })}</div>
            </div>
            <button onClick={() => runDemoAction(t('admin.config.documentOpened'), document.name)} style={{ padding: '6px 11px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{t('admin.config.previewAction')}</button>
          </div>
        ))}
      </Card>
      <div style={{ gridColumn: '1 / -1' }}>
        <AdminDevNote>{t('admin.config.devNote')}</AdminDevNote>
      </div>
    </div>
  );
}
