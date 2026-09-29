import type { ReactNode } from 'react';
import { useI18n } from '../../../shared/i18n';
import { C, FONT_HEAD } from '../../../shared/constants/theme';
import { ArrowLeft, ArrowRight, Trash2 } from '../../../shared/icons';
import { buttonStyle, CheckboxField, dangerButtonStyle, disabledStyle, Field, KeyInput, NumberInput, Pill, SelectInput, TextArea, TextInput } from './fields';
import {
  allowedAddonPriceUnits,
  allowedBookingModes,
  allowedPriceUnits,
  allowedVariantKinds,
  bookingModeOf,
  changeBookingMode,
  changeVariantKind,
  featureGroupHasFeatures,
  isPublishedKey,
  issuesFor,
  renameAddonKey,
  renameGroupKey,
  uniqueKey,
  usageOf,
  type NodeRef,
} from './model';
import { DAYS_OF_WEEK, type CatalogCategoryDoc, type CatalogDocument, type CatalogIssueDto, type CatalogUsageDto, type CatalogVariantDoc, type DayOfWeek } from './types';

// The form of the selected element. A published key is locked (providers' data refers to it); an
// element providers use can't be removed; a service's booking mode and variant kind can't change
// while providers offer it. Messages of issues the backend reported sit under their fields.

/**
 * The key of an element that isn't published yet follows its name (unique at its level); a
 * published key never changes - providers' data refers to it. Keys are never typed by hand.
 */
function followLabel(key: string, nextLabel: string, locked: boolean, siblings: string[]): string {
  if (locked || !nextLabel.trim()) return key;
  return uniqueKey(nextLabel, siblings);
}

export interface EditorProps {
  document: CatalogDocument;
  published: CatalogDocument;
  node: NodeRef;
  stayBased: boolean;
  usage: CatalogUsageDto;
  issues: CatalogIssueDto[];
  onChange: (category: CatalogCategoryDoc) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}

export function NodeEditor(props: EditorProps) {
  const { t } = useI18n();
  const { document, published, node, stayBased, usage, issues, onChange, onRemove, onMove } = props;
  const category = document.categories[node.category];
  if (!category) return null;

  const nodeIssues = issuesFor(document, issues, node);
  const fieldErrors = (field: string) => nodeIssues.filter((issue) => issue.field === field).map((issue) => issue.message);
  const otherIssues = nodeIssues.filter((issue) => !['key', 'label', 'labelEn', 'description', 'descriptionEn', 'bookingMode', 'variantKind', 'priceUnit', 'weightMin', 'nightsMin', 'nightsMax', 'durationMinutes', 'stayWindow', 'group', 'defaultDurationMinutes', 'type'].includes(issue.field ?? ''));
  const locked = isPublishedKey(published, document, node);
  const inUse = usageOf(usage, document, node);
  const lockedHint = t('admin.serviceCatalog.editor.keyLocked');

  // Polish only for now. Changing the Polish text drops the English one it was translated from, so
  // English readers get the current Polish text (the backend's fallback) rather than an outdated one.
  // A cleared name is flagged at once; the page won't save the draft until it is filled in again.
  const labels = (value: { label: string; labelEn: string }, apply: (label: string, labelEn: string) => void, lockPolish = false) => {
    const errors = fieldErrors('label');
    const shown = errors.length === 0 && !value.label.trim() ? [t('admin.serviceCatalog.editor.labelRequired')] : errors;
    return (
      <Field label={t('admin.serviceCatalog.editor.label')} error={shown}>
        <TextInput value={value.label} onChange={(label) => apply(label, '')} invalid={shown.length > 0} disabled={lockPolish} />
      </Field>
    );
  };

  // What a key is reads the same before and after publishing; only the sentence about its state changes.
  const keyKind = node.kind === 'addonGroup' || node.kind === 'featureGroup' ? 'group' : node.kind;
  const keyHint = (
    <>
      {t(`admin.serviceCatalog.editor.keyExplain.${keyKind}`)}{' '}
      <span style={{ color: locked ? C.textMedium : undefined, fontWeight: locked ? 600 : undefined }}>{locked ? lockedHint : t('admin.serviceCatalog.editor.keyStateNew')}</span>
    </>
  );
  const keyField = (key: string) => (
    <Field label={t('admin.serviceCatalog.editor.key')} hint={keyHint} error={fieldErrors('key')}>
      <KeyInput value={key} hint={locked ? lockedHint : t('admin.serviceCatalog.editor.keyStateNew')} invalid={fieldErrors('key').length > 0} ariaLabel={t('admin.serviceCatalog.editor.key')} />
    </Field>
  );

  const removal = (blockedReason: string | null, movable = true) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 6 }}>
      {movable ? (
        <>
          <button type="button" onClick={() => onMove(-1)} style={buttonStyle} aria-label={t('admin.serviceCatalog.editor.moveUp')} title={t('admin.serviceCatalog.editor.moveUp')}><ArrowLeft size={14} style={{ transform: 'rotate(90deg)' }} /></button>
          <button type="button" onClick={() => onMove(1)} style={buttonStyle} aria-label={t('admin.serviceCatalog.editor.moveDown')} title={t('admin.serviceCatalog.editor.moveDown')}><ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} /></button>
        </>
      ) : null}
      <button type="button" onClick={onRemove} disabled={!!blockedReason} style={disabledStyle({ ...dangerButtonStyle, marginLeft: 'auto' }, !!blockedReason)}>
        <Trash2 size={14} /> {t('admin.serviceCatalog.editor.remove')}
      </button>
      {blockedReason ? <span style={{ flexBasis: '100%', textAlign: 'right', fontSize: 11.5, color: C.textMuted }}>{blockedReason}</span> : null}
    </div>
  );

  const inUseReason = inUse > 0 ? t('admin.serviceCatalog.editor.inUseBlocked', { count: inUse }) : null;

  let title: string;
  let body: ReactNode;

  switch (node.kind) {
    case 'category': {
      title = t('admin.serviceCatalog.editor.categoryTitle', { type: t(`admin.serviceCatalog.providerTypes.${category.type}`) });
      body = (
        <>
          {labels(category, (label, labelEn) => onChange({ ...category, label, labelEn }))}
          <CheckboxField
            checked={!!category.sharedAddons}
            onChange={(sharedAddons) => onChange({ ...category, sharedAddons })}
            label={t('admin.serviceCatalog.editor.sharedAddons')}
            hint={t('admin.serviceCatalog.editor.sharedAddonsHint')}
          />
          {removal(inUseReason, false)}
        </>
      );
      break;
    }
    case 'service': {
      const service = category.services[node.index];
      if (!service) return null;
      const mode = bookingModeOf(service, stayBased);
      const siblings = category.services.filter((_, index) => index !== node.index).map((item) => item.key);
      const setService = (next: typeof service) => onChange({ ...category, services: category.services.map((item, index) => (index === node.index ? next : item)) });
      const shapeLocked = inUse > 0;
      title = t('admin.serviceCatalog.editor.serviceTitle');
      body = (
        <>
          {labels(service, (label, labelEn) => setService({ ...service, label, labelEn, key: followLabel(service.key, label, locked, siblings) }))}
          {keyField(service.key)}
          <Field label={t('admin.serviceCatalog.editor.description')} error={fieldErrors('description')}>
            <TextArea value={service.description} onChange={(description) => setService({ ...service, description, descriptionEn: '' })} invalid={fieldErrors('description').length > 0} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Field label={t('admin.serviceCatalog.editor.bookingMode')} hint={shapeLocked ? t('admin.serviceCatalog.editor.shapeLocked') : t(`admin.serviceCatalog.bookingModeHint.${mode}`)} error={fieldErrors('bookingMode')}>
              <SelectInput
                value={mode}
                options={allowedBookingModes(stayBased).map((value) => ({ value, label: t(`admin.serviceCatalog.bookingMode.${value}`) }))}
                onChange={(value) => setService(changeBookingMode(service, value, stayBased))}
                disabled={shapeLocked || allowedBookingModes(stayBased).length === 1}
                ariaLabel={t('admin.serviceCatalog.editor.bookingMode')}
              />
            </Field>
            <Field label={t('admin.serviceCatalog.editor.variantKind')} hint={shapeLocked ? t('admin.serviceCatalog.editor.shapeLocked') : t(`admin.serviceCatalog.variantKindHint.${service.variantKind}`)} error={fieldErrors('variantKind')}>
              <SelectInput
                value={service.variantKind}
                options={allowedVariantKinds(mode).map((value) => ({ value, label: t(`admin.serviceCatalog.variantKind.${value}`) }))}
                onChange={(value) => setService(changeVariantKind(service, value, stayBased))}
                disabled={shapeLocked}
                ariaLabel={t('admin.serviceCatalog.editor.variantKind')}
              />
            </Field>
          </div>
          <CheckboxField checked={service.bookable !== false} onChange={(bookable) => setService({ ...service, bookable })} label={t('admin.serviceCatalog.editor.bookable')} hint={t('admin.serviceCatalog.editor.bookableHint')} />
          <Field label={t('admin.serviceCatalog.editor.recommendedAddons')} hint={category.sharedAddons ? t('admin.serviceCatalog.editor.recommendedAddonsShared') : t('admin.serviceCatalog.editor.recommendedAddonsHint')} error={fieldErrors('addonKeys')}>
            {(category.addons ?? []).length === 0 ? <span style={{ display: 'block', fontSize: 12.5, color: C.textMuted }}>{t('admin.serviceCatalog.editor.noAddonsYet')}</span> : (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(category.addons ?? []).map((addon) => {
                  const checked = (service.addonKeys ?? []).includes(addon.key);
                  return (
                    <label key={addon.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: `1px solid ${checked ? C.primary : C.border}`, fontSize: 12.5, cursor: 'pointer', background: checked ? 'oklch(0.97 0.03 80)' : C.bgCard }}>
                      <input type="checkbox" checked={checked} onChange={(event) => setService({ ...service, addonKeys: event.target.checked ? [...(service.addonKeys ?? []), addon.key] : (service.addonKeys ?? []).filter((key) => key !== addon.key) })} style={{ accentColor: C.primary }} />
                      {addon.label || addon.key}
                    </label>
                  );
                })}
              </span>
            )}
          </Field>
          {removal(inUseReason)}
        </>
      );
      break;
    }
    case 'variant': {
      const service = category.services[node.service];
      const variant = service?.variants[node.index];
      if (!service || !variant) return null;
      const mode = bookingModeOf(service, stayBased);
      const siblings = service.variants.filter((_, index) => index !== node.index).map((item) => item.key);
      const setVariant = (next: CatalogVariantDoc) => onChange({
        ...category,
        services: category.services.map((item, index) => (index === node.service ? { ...item, variants: item.variants.map((current, variantIndex) => (variantIndex === node.index ? next : current)) } : item)),
      });
      const window = variant.stayWindow ?? null;
      const canHaveWindow = mode === 'STAY' && service.variantKind !== 'NIGHTS';
      title = t('admin.serviceCatalog.editor.variantTitle', { service: service.label || service.key });
      const lastVariant = service.variants.length <= 1;
      body = (
        <>
          {labels(variant, (label, labelEn) => setVariant({ ...variant, label, labelEn, key: followLabel(variant.key, label, locked, siblings) }))}
          {keyField(variant.key)}
          <Field label={t('admin.serviceCatalog.editor.priceUnit')} error={fieldErrors('priceUnit')}>
            <SelectInput
              value={variant.priceUnit}
              options={allowedPriceUnits(mode).map((value) => ({ value, label: t(`admin.serviceCatalog.priceUnit.${value}`) }))}
              onChange={(priceUnit) => setVariant({ ...variant, priceUnit })}
              disabled={service.variantKind === 'NIGHTS'}
              ariaLabel={t('admin.serviceCatalog.editor.priceUnit')}
            />
          </Field>
          {service.variantKind === 'WEIGHT' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={t('admin.serviceCatalog.editor.weightMin')} hint={t('admin.serviceCatalog.editor.weightMinHint')} error={fieldErrors('weightMin')}>
                <NumberInput value={variant.weightMin} onChange={(weightMin) => setVariant({ ...variant, weightMin })} min={0} step={0.5} invalid={fieldErrors('weightMin').length > 0} />
              </Field>
              <Field label={t('admin.serviceCatalog.editor.weightMax')} hint={t('admin.serviceCatalog.editor.weightMaxHint')}>
                <NumberInput value={variant.weightMax} onChange={(weightMax) => setVariant({ ...variant, weightMax })} min={0} step={0.5} />
              </Field>
            </div>
          ) : null}
          {service.variantKind === 'NIGHTS' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={t('admin.serviceCatalog.editor.nightsMin')} error={fieldErrors('nightsMin')}>
                <NumberInput value={variant.nightsMin} onChange={(nightsMin) => setVariant({ ...variant, nightsMin })} min={1} invalid={fieldErrors('nightsMin').length > 0} />
              </Field>
              <Field label={t('admin.serviceCatalog.editor.nightsMax')} hint={t('admin.serviceCatalog.editor.nightsMaxHint')} error={fieldErrors('nightsMax')}>
                <NumberInput value={variant.nightsMax} onChange={(nightsMax) => setVariant({ ...variant, nightsMax })} min={1} invalid={fieldErrors('nightsMax').length > 0} />
              </Field>
            </div>
          ) : null}
          {service.variantKind === 'DURATION' || mode === 'SLOT' ? (
            <Field
              label={service.variantKind === 'DURATION' ? t('admin.serviceCatalog.editor.durationRequired') : t('admin.serviceCatalog.editor.durationSuggested')}
              error={fieldErrors('durationMinutes')}
            >
              <NumberInput value={variant.durationMinutes} onChange={(durationMinutes) => setVariant({ ...variant, durationMinutes })} min={5} step={5} invalid={fieldErrors('durationMinutes').length > 0} />
            </Field>
          ) : null}
          {canHaveWindow ? (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
              <CheckboxField
                checked={!!window}
                onChange={(on) => setVariant({ ...variant, stayWindow: on ? { minNights: null, maxNights: 0, days: [] } : null })}
                label={t('admin.serviceCatalog.editor.stayWindow')}
                hint={t('admin.serviceCatalog.editor.stayWindowHint')}
              />
              {window ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label={t('admin.serviceCatalog.editor.windowMinNights')}>
                      <NumberInput value={window.minNights} onChange={(minNights) => setVariant({ ...variant, stayWindow: { ...window, minNights } })} min={0} />
                    </Field>
                    <Field label={t('admin.serviceCatalog.editor.windowMaxNights')} hint={t('admin.serviceCatalog.editor.windowMaxNightsHint')}>
                      <NumberInput value={window.maxNights} onChange={(maxNights) => setVariant({ ...variant, stayWindow: { ...window, maxNights } })} min={0} />
                    </Field>
                  </div>
                  <Field label={t('admin.serviceCatalog.editor.windowDays')} hint={t('admin.serviceCatalog.editor.windowDaysHint')} error={fieldErrors('stayWindow')}>
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {DAYS_OF_WEEK.map((day: DayOfWeek) => {
                        const checked = (window.days ?? []).includes(day);
                        return (
                          <label key={day} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, border: `1px solid ${checked ? C.primary : C.border}`, fontSize: 12, cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked} onChange={(event) => setVariant({ ...variant, stayWindow: { ...window, days: event.target.checked ? DAYS_OF_WEEK.filter((candidate) => candidate === day || (window.days ?? []).includes(candidate)) : (window.days ?? []).filter((candidate) => candidate !== day) } })} style={{ accentColor: C.primary }} />
                            {t(`admin.serviceCatalog.days.${day}`)}
                          </label>
                        );
                      })}
                    </span>
                  </Field>
                </>
              ) : null}
            </div>
          ) : null}
          {removal(inUseReason ?? (lastVariant ? t('admin.serviceCatalog.editor.lastVariant') : null))}
        </>
      );
      break;
    }
    case 'addonGroup':
    case 'featureGroup': {
      const section = node.kind === 'addonGroup' ? 'addonGroups' : 'featureGroups';
      const groups = category[section] ?? [];
      const group = groups[node.index];
      if (!group) return null;
      const siblings = groups.filter((_, index) => index !== node.index).map((item) => item.key);
      const setGroup = (next: typeof group) => {
        const renamed = next.key !== group.key ? renameGroupKey(category, section, group.key, next.key) : category;
        onChange({ ...renamed, [section]: (renamed[section] ?? []).map((item, index) => (index === node.index ? next : item)) });
      };
      const blocked = node.kind === 'featureGroup' && featureGroupHasFeatures(category, node.index) ? t('admin.serviceCatalog.editor.groupHasFeatures') : null;
      title = t(node.kind === 'addonGroup' ? 'admin.serviceCatalog.editor.addonGroupTitle' : 'admin.serviceCatalog.editor.featureGroupTitle');
      body = (
        <>
          {labels(group, (label, labelEn) => setGroup({ ...group, label, labelEn, key: followLabel(group.key, label, locked, siblings) }))}
          {keyField(group.key)}
          {node.kind === 'addonGroup' ? <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{t('admin.serviceCatalog.editor.addonGroupRemoveNote')}</p> : null}
          {removal(blocked, false)}
        </>
      );
      break;
    }
    case 'addon': {
      const addons = category.addons ?? [];
      const addon = addons[node.index];
      if (!addon) return null;
      const siblings = addons.filter((_, index) => index !== node.index).map((item) => item.key);
      const setAddon = (next: typeof addon) => {
        const renamed = next.key !== addon.key ? renameAddonKey(category, addon.key, next.key) : category;
        onChange({ ...renamed, addons: (renamed.addons ?? []).map((item, index) => (index === node.index ? next : item)) });
      };
      title = t('admin.serviceCatalog.editor.addonTitle');
      body = (
        <>
          {labels(addon, (label, labelEn) => setAddon({ ...addon, label, labelEn, key: followLabel(addon.key, label, locked, siblings) }))}
          {keyField(addon.key)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Field label={t('admin.serviceCatalog.editor.group')} error={fieldErrors('group')}>
              <SelectInput
                value={addon.group ?? ''}
                options={[{ value: '', label: t('admin.serviceCatalog.editor.noGroup') }, ...(category.addonGroups ?? []).map((group) => ({ value: group.key, label: group.label || group.key }))]}
                onChange={(group) => setAddon({ ...addon, group: group || null })}
                ariaLabel={t('admin.serviceCatalog.editor.group')}
              />
            </Field>
            <Field label={t('admin.serviceCatalog.editor.priceUnit')} error={fieldErrors('priceUnit')}>
              <SelectInput
                value={addon.priceUnit}
                options={allowedAddonPriceUnits(stayBased).map((value) => ({ value, label: t(`admin.serviceCatalog.addonPriceUnit.${value}`) }))}
                onChange={(priceUnit) => setAddon({ ...addon, priceUnit })}
                ariaLabel={t('admin.serviceCatalog.editor.priceUnit')}
              />
            </Field>
            {!stayBased ? (
              <Field label={t('admin.serviceCatalog.editor.addonDuration')} hint={t('admin.serviceCatalog.editor.addonDurationHint')} error={fieldErrors('defaultDurationMinutes')}>
                <NumberInput value={addon.defaultDurationMinutes ?? 0} onChange={(minutes) => setAddon({ ...addon, defaultDurationMinutes: minutes ?? 0 })} min={0} step={5} />
              </Field>
            ) : null}
          </div>
          {removal(inUseReason)}
        </>
      );
      break;
    }
    case 'feature': {
      const features = category.features ?? [];
      const feature = features[node.index];
      if (!feature) return null;
      const siblings = features.filter((_, index) => index !== node.index).map((item) => item.key);
      const setFeature = (next: typeof feature) => onChange({ ...category, features: features.map((item, index) => (index === node.index ? next : item)) });
      title = t('admin.serviceCatalog.editor.featureTitle');
      body = (
        <>
          {inUse > 0 ? <p style={{ fontSize: 12, color: C.amber, margin: 0 }}>{t('admin.serviceCatalog.editor.featureLabelLocked')}</p> : null}
          {labels(feature, (label, labelEn) => setFeature({ ...feature, label, labelEn, key: followLabel(feature.key, label, locked, siblings) }), inUse > 0)}
          {keyField(feature.key)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Field label={t('admin.serviceCatalog.editor.group')} error={fieldErrors('group')}>
              <SelectInput
                value={feature.group}
                options={(category.featureGroups ?? []).map((group) => ({ value: group.key, label: group.label || group.key }))}
                onChange={(group) => setFeature({ ...feature, group })}
                ariaLabel={t('admin.serviceCatalog.editor.group')}
              />
            </Field>
            <Field label={t('admin.serviceCatalog.editor.profileFlag')} hint={t('admin.serviceCatalog.editor.profileFlagHint')}>
              <SelectInput
                value={feature.profileFlag ?? ''}
                options={[{ value: '', label: t('admin.serviceCatalog.editor.noProfileFlag') }, { value: 'ACCEPTS_REACTIVE_DOGS', label: t('admin.serviceCatalog.profileFlag.ACCEPTS_REACTIVE_DOGS') }]}
                onChange={(profileFlag) => setFeature({ ...feature, profileFlag: profileFlag ? 'ACCEPTS_REACTIVE_DOGS' : null })}
                ariaLabel={t('admin.serviceCatalog.editor.profileFlag')}
              />
            </Field>
          </div>
          {removal(inUseReason)}
        </>
      );
      break;
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: FONT_HEAD, fontSize: 19, margin: 0 }}>{title}</h3>
        {locked ? <Pill title={lockedHint}>{t('admin.serviceCatalog.editor.published')}</Pill> : <Pill tone="success">{t('admin.serviceCatalog.editor.new')}</Pill>}
        {inUse > 0 ? <Pill tone="warning">{t('admin.serviceCatalog.tree.inUse', { count: inUse })}</Pill> : null}
      </div>
      {otherIssues.length > 0 ? (
        <div role="alert" style={{ background: 'oklch(0.97 0.02 20)', border: '1px solid oklch(0.88 0.06 15)', borderRadius: 12, padding: '10px 12px', display: 'grid', gap: 4 }}>
          {otherIssues.map((issue) => <span key={`${issue.code}-${issue.detail}`} style={{ fontSize: 12.5, color: C.roseDark }}>{issue.message}</span>)}
        </div>
      ) : null}
      {body}
    </div>
  );
}
