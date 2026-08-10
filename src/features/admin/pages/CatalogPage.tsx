import { useMemo, useState } from 'react';
import { Store, Tag } from '../../../shared/icons';
import { Card, DevNote, SectionTitle } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import type { ProviderType } from '../../../shared/types/furli';
import { useAdminState } from '../context';
import { catalogProviderTypes, hiddenCatalogEntries, resolveCatalog, type CatalogEntryView, type CatalogKind } from '../catalog';

const rowInputStyle = { border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 9, padding: '7px 10px', fontFamily: FONT_BODY, fontSize: 13.5, color: C.text };
const rowButtonStyle = { fontSize: 12.5, fontWeight: 700, borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: FONT_BODY, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium };

function CatalogRow({
  entry,
  hidden,
  onSave,
  onHide,
  onDelete,
}: {
  entry: CatalogEntryView;
  hidden: boolean;
  onSave: (label: string, sub: string) => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: entry.label, sub: entry.sub });

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', opacity: hidden ? 0.55 : 1 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, textDecoration: hidden ? 'line-through' : 'none' }}>{entry.label}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
            <span style={{ fontFamily: FONT_NUM }}>{entry.id}</span>{entry.sub ? ` · ${entry.sub}` : ''}
            {!entry.isBase ? ` · ${t('admin.catalog.addedFromPanel')}` : ''}
          </div>
        </div>
        <button onClick={() => { setForm({ label: entry.label, sub: entry.sub }); setEditing(true); }} style={rowButtonStyle}>{t('admin.catalog.editAction')}</button>
        <button onClick={onHide} style={rowButtonStyle}>{t(hidden ? 'admin.catalog.restoreAction' : 'admin.catalog.hideAction')}</button>
        {!entry.isBase ? <button onClick={onDelete} style={{ ...rowButtonStyle, color: C.roseDark, border: '1px solid oklch(0.85 0.06 15)' }}>{t('common.actions.delete')}</button> : null}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
      <input style={{ ...rowInputStyle, flex: 1, minWidth: 160 }} value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
      <input style={{ ...rowInputStyle, flex: 1, minWidth: 160 }} value={form.sub} onChange={(event) => setForm((current) => ({ ...current, sub: event.target.value }))} placeholder={t('admin.catalog.subFieldPlaceholder')} />
      <button onClick={() => { onSave(form.label, form.sub); setEditing(false); }} style={{ ...rowButtonStyle, background: C.green, color: '#fff', border: 'none' }}>{t('admin.catalog.saveAction')}</button>
      <button onClick={() => { setForm({ label: entry.label, sub: entry.sub }); setEditing(false); }} style={rowButtonStyle}>{t('common.actions.cancel')}</button>
    </div>
  );
}

const kindPillStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: FONT_BODY,
  fontSize: 13,
  fontWeight: 700,
  border: `1px solid ${active ? C.text : C.border}`,
  background: active ? C.text : C.bgCard,
  color: active ? '#fff' : C.textMedium,
});

export function AdminCatalogPage() {
  const { t } = useI18n();
  const { catalogOverlay, addCatalogEntry, updateCatalogEntry, setCatalogEntryHidden, deleteCatalogEntry } = useAdminState();
  const [kind, setKind] = useState<CatalogKind>('services');
  const [type, setType] = useState<ProviderType>('veterinarian');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftSub, setDraftSub] = useState('');

  const overlay = catalogOverlay[kind];
  const types = useMemo(() => catalogProviderTypes(kind, overlay), [kind, overlay]);
  const visible = useMemo(() => resolveCatalog(kind, type, overlay), [kind, type, overlay]);
  const hidden = useMemo(() => hiddenCatalogEntries(kind, type, overlay), [kind, type, overlay]);

  const changeKind = (nextKind: CatalogKind) => {
    setKind(nextKind);
    setType('veterinarian');
  };

  const addEntry = () => {
    addCatalogEntry(kind, type, draftLabel, draftSub);
    setDraftLabel('');
    setDraftSub('');
  };

  return (
    <div>
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => changeKind('services')} style={kindPillStyle(kind === 'services')}>{t('admin.catalog.kindServices')}</button>
          <button onClick={() => changeKind('specialties')} style={kindPillStyle(kind === 'specialties')}>{t('admin.catalog.kindSpecialties')}</button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map((providerType) => (
              <button key={providerType} onClick={() => setType(providerType)} style={{ ...kindPillStyle(type === providerType), fontSize: 12.5 }}>
                {t(`admin.providerType.${providerType}`)}
              </button>
            ))}
          </span>
        </div>

        <SectionTitle Icon={Tag} right={<span style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT_NUM }}>{t('admin.catalog.itemCount', { count: visible.length })}</span>}>
          {t('admin.catalog.sectionTitle', { kind: t(kind === 'services' ? 'admin.catalog.kindServices' : 'admin.catalog.kindSpecialties'), type: t(`admin.providerType.${type}`) })}
        </SectionTitle>

        {visible.length === 0 ? <p style={{ fontSize: 13, color: C.textMuted }}>{t('admin.catalog.emptyForType')}</p> : null}
        {visible.map((entry) => (
          <CatalogRow
            key={entry.id}
            entry={entry}
            hidden={false}
            onSave={(label, sub) => updateCatalogEntry(kind, entry.id, label, sub)}
            onHide={() => setCatalogEntryHidden(kind, entry.id, true)}
            onDelete={() => deleteCatalogEntry(kind, entry.id)}
          />
        ))}

        {hidden.length > 0 ? (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.textMuted, margin: '18px 0 2px' }}>{t('admin.catalog.hiddenSectionLabel')}</div>
            {hidden.map((entry) => (
              <CatalogRow
                key={entry.id}
                entry={entry}
                hidden
                onSave={(label, sub) => updateCatalogEntry(kind, entry.id, label, sub)}
                onHide={() => setCatalogEntryHidden(kind, entry.id, false)}
                onDelete={() => deleteCatalogEntry(kind, entry.id)}
              />
            ))}
          </>
        ) : null}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <input
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            placeholder={t(kind === 'services' ? 'admin.catalog.newServiceLabelPlaceholder' : 'admin.catalog.newSpecialtyLabelPlaceholder')}
            style={{ flex: 1, minWidth: 180, border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 10, padding: '9px 12px', fontFamily: FONT_BODY, fontSize: 13.5, color: C.text }}
          />
          <input
            value={draftSub}
            onChange={(event) => setDraftSub(event.target.value)}
            placeholder={t(kind === 'services' ? 'admin.catalog.newServiceSubPlaceholder' : 'admin.catalog.newSpecialtySubPlaceholder')}
            style={{ flex: 1, minWidth: 180, border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 10, padding: '9px 12px', fontFamily: FONT_BODY, fontSize: 13.5, color: C.text }}
          />
          <button
            onClick={addEntry}
            disabled={!draftLabel.trim()}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: draftLabel.trim() ? C.primary : C.bgMuted, color: draftLabel.trim() ? '#fff' : C.textMuted, fontSize: 13.5, fontWeight: 700, cursor: draftLabel.trim() ? 'pointer' : 'default', fontFamily: FONT_BODY }}
          >
            {t('admin.catalog.addEntryAction')}
          </button>
        </div>
        <DevNote>{t('admin.catalog.devNote')}</DevNote>
      </Card>

      <Card style={{ padding: 22 }}>
        <SectionTitle Icon={Store}>{t('admin.catalog.howToTitle')}</SectionTitle>
        <p style={{ fontSize: 13.5, color: C.textMedium, lineHeight: 1.6 }}>{t('admin.catalog.howToBody1')}</p>
        <p style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginTop: 8 }}>{t('admin.catalog.howToBody2')}</p>
      </Card>
    </div>
  );
}
