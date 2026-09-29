import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useI18n } from '../../../shared/i18n';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { AlertCircle, ChevronRight, Plus } from '../../../shared/icons';
import { Pill } from './fields';
import { bookingModeOf, issuesFor, nameTaken, sameRef, usageOf, type NodeRef } from './model';
import type { CatalogCategoryDoc, CatalogDocument, CatalogIssueDto, CatalogUsageDto, CatalogVariantDoc } from './types';

// One section of a category's structure, as a list of collapsible parents (a service, an add-on
// group, a feature group) with their children inside. Every "Add" sits on the element it adds to -
// a variant on its service, a feature on its feature group - so nothing can be created without its
// parent, and it asks for the name first, so nothing is created without a name either. Keys are technical, so the list shows names and what matters at a glance; the editor
// shows the key.

export type CatalogSection = 'services' | 'addons' | 'features';

export function sectionOf(ref: NodeRef): CatalogSection | null {
  switch (ref.kind) {
    case 'service':
    case 'variant':
      return 'services';
    case 'addonGroup':
    case 'addon':
      return 'addons';
    case 'featureGroup':
    case 'feature':
      return 'features';
    default:
      return null;
  }
}

export interface TreeActions {
  addService: (label: string) => void;
  addVariant: (service: number, label: string) => void;
  addAddonGroup: (label: string) => void;
  addAddon: (groupKey: string | null, label: string) => void;
  addFeatureGroup: (label: string) => void;
  addFeature: (groupKey: string, label: string) => void;
}

interface RowContext {
  document: CatalogDocument;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  issues: CatalogIssueDto[];
  usage: CatalogUsageDto;
}

const muted = { fontSize: 12, color: C.textMuted } as const;

function Badges({ context, node, extraProblems = 0, children }: { context: RowContext; node: NodeRef; extraProblems?: number; children?: ReactNode }) {
  const { t } = useI18n();
  const problems = issuesFor(context.document, context.issues, node).length + extraProblems;
  const inUse = usageOf(context.usage, context.document, node);
  return (
    <>
      {children}
      {inUse > 0 ? <Pill title={t('admin.serviceCatalog.tree.inUseTitle', { count: inUse })}>{t('admin.serviceCatalog.tree.inUse', { count: inUse })}</Pill> : null}
      {problems > 0 ? <span title={t('admin.serviceCatalog.tree.issuesTitle', { count: problems })} style={{ display: 'flex', color: C.roseDark }}><AlertCircle size={15} /></span> : null}
    </>
  );
}

/** The name of a new element, asked for before it exists: empty or already used names can't be added. */
function AddForm({ placeholder, hint, siblings, onSubmit, onCancel }: { placeholder: string; hint?: string; siblings: { label: string }[]; onSubmit: (label: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const taken = name.trim() !== '' && nameTaken(name, siblings);
  const valid = name.trim() !== '' && !taken;
  const submit = () => { if (valid) onSubmit(name.trim()); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); submit(); }
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
  };
  return (
    <div style={{ display: 'grid', gap: 6, padding: 10, borderRadius: 10, border: `1px solid ${C.primary}`, background: 'oklch(0.985 0.02 80)' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={taken}
          style={{ flex: '1 1 160px', minWidth: 0, padding: '8px 10px', borderRadius: 8, border: `1px solid ${taken ? C.roseDark : C.border}`, background: C.bgCard, fontFamily: FONT_BODY, fontSize: 13.5, color: C.text, outline: 'none' }}
        />
        <button type="button" onClick={submit} disabled={!valid} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: valid ? C.primary : C.bgMuted, color: valid ? '#fff' : C.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}>
          {t('admin.serviceCatalog.tree.confirmAdd')}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMedium, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {t('admin.serviceCatalog.tree.cancelAdd')}
        </button>
      </div>
      <span role={taken ? 'alert' : undefined} style={{ fontSize: 11.5, lineHeight: 1.4, color: taken ? C.roseDark : C.textMuted }}>
        {taken ? t('admin.serviceCatalog.tree.nameTaken') : hint ?? t('admin.serviceCatalog.tree.nameRequired')}
      </span>
    </div>
  );
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: C.amber, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_BODY }}>
      <Plus size={13} /> {label}
    </button>
  );
}

function ChildRow({ context, node, label, meta }: { context: RowContext; node: NodeRef; label: string; meta?: string }) {
  const { t } = useI18n();
  const active = sameRef(context.selected, node);
  return (
    <button
      type="button"
      onClick={() => context.onSelect(node)}
      aria-current={active ? 'true' : undefined}
     
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', background: active ? 'oklch(0.95 0.045 80)' : 'transparent', boxShadow: active ? `inset 3px 0 0 ${C.primary}` : 'none', cursor: 'pointer', fontFamily: FONT_BODY, color: C.text }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: label.trim() ? C.text : C.roseDark }}>{label || t('admin.serviceCatalog.tree.unnamed')}</span>
      {meta ? <span style={{ ...muted, whiteSpace: 'nowrap' }}>{meta}</span> : null}
      <Badges context={context} node={node} />
    </button>
  );
}

// A parent with its children. Collapsed it shows a one-line summary; it opens on demand and always
// while it or one of its children is selected.
function Branch({ context, node, label, meta, badges, childProblems, open, onToggle, addLabel, onAdd, addForm, emptyText, children }: {
  context: RowContext;
  node: NodeRef | null;
  label: string;
  meta: string;
  badges?: ReactNode;
  childProblems: number;
  open: boolean;
  onToggle: () => void;
  addLabel: string;
  onAdd: () => void;
  /** The name form of a new child, while one is being added here. */
  addForm: ReactNode;
  emptyText?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const active = !!node && sameRef(context.selected, node);
  const header = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: label.trim() ? C.text : C.roseDark }}>{label || t('admin.serviceCatalog.tree.unnamed')}</span>
        <span style={{ display: 'block', ...muted, marginTop: 1 }}>{meta}</span>
      </span>
      {node ? <Badges context={context} node={node} extraProblems={open ? 0 : childProblems}>{badges}</Badges> : null}
    </>
  );
  const headerStyle = { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 4px', border: 'none', background: 'transparent', textAlign: 'left' as const, fontFamily: FONT_BODY, color: C.text };
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${active ? C.primary : C.border}`, background: C.bgCard, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: active ? 'oklch(0.97 0.03 80)' : 'transparent' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? t('admin.serviceCatalog.tree.collapse') : t('admin.serviceCatalog.tree.expand')}: ${label || t('admin.serviceCatalog.tree.unnamed')}`}
          style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'center', padding: '0 6px 0 10px', border: 'none', background: 'transparent', color: C.textMuted, cursor: 'pointer' }}
        >
          <ChevronRight size={16} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {node ? (
          <button type="button" onClick={() => context.onSelect(node)} aria-current={active ? 'true' : undefined} style={{ ...headerStyle, cursor: 'pointer' }}>{header}</button>
        ) : (
          <div style={headerStyle}>{header}</div>
        )}
      </div>
      {open ? (
        <div style={{ padding: '0 10px 6px 30px' }}>
          <div style={{ borderLeft: `2px solid ${C.border}`, paddingLeft: 6, display: 'grid', gap: 1 }}>
            {emptyText ? <span style={{ ...muted, padding: '6px 10px' }}>{emptyText}</span> : null}
            {children}
          </div>
          <div style={{ paddingLeft: 4, paddingTop: addForm ? 6 : 0 }}>{addForm ?? <AddLink label={addLabel} onClick={onAdd} />}</div>
        </div>
      ) : null}
    </div>
  );
}

function SectionHeader({ hint, add, toggle }: { hint: string; add: ReactNode; toggle: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 10, margin: '0 0 4px' }}>
      <span style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45 }}>{hint}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {add}
        <span style={{ marginLeft: 'auto' }}>{toggle}</span>
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, primary = false }: { label: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, border: `1px solid ${primary ? C.primary : C.border}`, background: primary ? 'oklch(0.97 0.03 80)' : 'transparent', color: primary ? C.amber : C.textMedium, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_BODY, whiteSpace: 'nowrap' }}>
      {label}
    </button>
  );
}

export function CatalogTree({ document, categoryIndex, section, stayBased, selected, onSelect, issues, usage, actions }: {
  document: CatalogDocument;
  categoryIndex: number;
  section: CatalogSection;
  stayBased: boolean;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  issues: CatalogIssueDto[];
  usage: CatalogUsageDto;
  actions: TreeActions;
}) {
  const { t } = useI18n();
  // Branches opened by hand ("service-2", "addonGroup-0", "ungrouped", ...). The page remounts the
  // tree per provider type, so this starts empty for each type.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // Where a new element's name is being asked for: "section" (a service or a group) or a branch id.
  const [adding, setAdding] = useState<string | null>(null);
  const category: CatalogCategoryDoc | undefined = document.categories[categoryIndex];
  if (!category) return null;
  const context: RowContext = { document, selected, onSelect, issues, usage };

  const addonGroups = category.addonGroups ?? [];
  const addons = category.addons ?? [];
  const featureGroups = category.featureGroups ?? [];
  const features = category.features ?? [];
  const ungroupedAddons = addons.map((addon, index) => ({ addon, index })).filter(({ addon }) => !addon.group || !addonGroups.some((group) => group.key === addon.group));

  const problemsOf = (refs: NodeRef[]) => refs.reduce((sum, ref) => sum + issuesFor(document, issues, ref).length, 0);
  const holdsSelection = (id: string) => {
    if (!selected || selected.category !== categoryIndex) return false;
    switch (selected.kind) {
      case 'service': return id === `service-${selected.index}`;
      case 'variant': return id === `service-${selected.service}`;
      case 'addonGroup': return id === `addonGroup-${selected.index}`;
      case 'featureGroup': return id === `featureGroup-${selected.index}`;
      case 'addon': {
        const group = addonGroups.findIndex((candidate) => candidate.key === addons[selected.index]?.group);
        return id === (group < 0 ? 'ungrouped' : `addonGroup-${group}`);
      }
      case 'feature': {
        const group = featureGroups.findIndex((candidate) => candidate.key === features[selected.index]?.group);
        return id === `featureGroup-${group}`;
      }
      default: return false;
    }
  };
  const isOpen = (id: string) => expanded.has(id) || holdsSelection(id);
  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id) || holdsSelection(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const branchIds = section === 'services'
    ? category.services.map((_, index) => `service-${index}`)
    : section === 'addons'
      ? [...addonGroups.map((_, index) => `addonGroup-${index}`), 'ungrouped']
      : featureGroups.map((_, index) => `featureGroup-${index}`);
  const allOpen = branchIds.length > 0 && branchIds.every(isOpen);
  const expandToggle = branchIds.length > 1 ? (
    <ToolbarButton
      label={allOpen ? t('admin.serviceCatalog.tree.collapseAll') : t('admin.serviceCatalog.tree.expandAll')}
      onClick={() => setExpanded(allOpen ? new Set() : new Set(branchIds))}
    />
  ) : null;

  const startAdding = (where: string) => {
    setAdding(where);
    if (where !== 'section') setExpanded((current) => new Set(current).add(where));
  };
  const addFormFor = (where: string, placeholder: string, siblings: { label: string }[], onSubmit: (label: string) => void, hint?: string) => (
    adding === where ? (
      <AddForm placeholder={placeholder} hint={hint} siblings={siblings} onCancel={() => setAdding(null)} onSubmit={(label) => { setAdding(null); onSubmit(label); }} />
    ) : null
  );
  const addButton = (label: string) => (
    <ToolbarButton primary label={<><Plus size={13} /> {label}</>} onClick={() => startAdding('section')} />
  );

  const variantMeta = (variant: CatalogVariantDoc) => [
    variant.durationMinutes ? t('admin.serviceCatalog.tree.minutes', { count: variant.durationMinutes }) : null,
    t(`admin.serviceCatalog.priceUnit.${variant.priceUnit}`),
  ].filter(Boolean).join(' · ');

  if (section === 'services') return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SectionHeader hint={t('admin.serviceCatalog.tree.servicesHint')} add={addButton(t('admin.serviceCatalog.tree.addService'))} toggle={expandToggle} />
      {addFormFor('section', t('admin.serviceCatalog.tree.newServiceName'), category.services, actions.addService, t('admin.serviceCatalog.tree.newServiceHint'))}
      {category.services.length === 0 ? <p style={{ ...muted, margin: 0 }}>{t('admin.serviceCatalog.tree.noServices')}</p> : null}
      {category.services.map((service, serviceIndex) => {
        const id = `service-${serviceIndex}`;
        const variantRefs: NodeRef[] = service.variants.map((_, index) => ({ kind: 'variant', category: categoryIndex, service: serviceIndex, index }));
        return (
          <Branch
            key={id}
            context={context}
            node={{ kind: 'service', category: categoryIndex, index: serviceIndex }}
            label={service.label}
           
            meta={`${t('admin.serviceCatalog.tree.variantCount', { count: service.variants.length })} · ${t(`admin.serviceCatalog.bookingMode.${bookingModeOf(service, stayBased)}`)}`}
            badges={service.bookable === false ? <Pill tone="warning">{t('admin.serviceCatalog.tree.notBookable')}</Pill> : null}
            childProblems={problemsOf(variantRefs)}
            open={isOpen(id)}
            onToggle={() => toggle(id)}
            addLabel={t('admin.serviceCatalog.tree.addVariant')}
            onAdd={() => startAdding(id)}
            addForm={addFormFor(id, t('admin.serviceCatalog.tree.newVariantName'), service.variants, (label) => actions.addVariant(serviceIndex, label))}
          >
            {service.variants.map((variant, variantIndex) => (
              <ChildRow key={`variant-${variantIndex}`} context={context} node={variantRefs[variantIndex]} label={variant.label} meta={variantMeta(variant)} />
            ))}
          </Branch>
        );
      })}
    </div>
  );

  const addonMeta = (index: number) => {
    const addon = addons[index];
    return [
      addon.defaultDurationMinutes ? t('admin.serviceCatalog.tree.addonMinutes', { count: addon.defaultDurationMinutes }) : null,
      t(`admin.serviceCatalog.addonPriceUnit.${addon.priceUnit}`),
    ].filter(Boolean).join(' · ');
  };

  if (section === 'addons') return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SectionHeader hint={t('admin.serviceCatalog.tree.addonsHint')} add={addButton(t('admin.serviceCatalog.tree.addAddonGroup'))} toggle={expandToggle} />
      {addFormFor('section', t('admin.serviceCatalog.tree.newAddonGroupName'), addonGroups, actions.addAddonGroup)}
      {addonGroups.map((group, groupIndex) => {
        const id = `addonGroup-${groupIndex}`;
        const members = addons.map((addon, index) => ({ addon, index })).filter(({ addon }) => addon.group === group.key);
        return (
          <Branch
            key={id}
            context={context}
            node={{ kind: 'addonGroup', category: categoryIndex, index: groupIndex }}
            label={group.label}
           
            meta={t('admin.serviceCatalog.tree.addonCount', { count: members.length })}
            childProblems={problemsOf(members.map(({ index }) => ({ kind: 'addon', category: categoryIndex, index })))}
            open={isOpen(id)}
            onToggle={() => toggle(id)}
            addLabel={t('admin.serviceCatalog.tree.addAddon')}
            onAdd={() => startAdding(id)}
            addForm={addFormFor(id, t('admin.serviceCatalog.tree.newAddonName'), addons, (label) => actions.addAddon(group.key, label))}
            emptyText={members.length === 0 ? t('admin.serviceCatalog.tree.emptyGroup') : undefined}
          >
            {members.map(({ addon, index }) => (
              <ChildRow key={`addon-${index}`} context={context} node={{ kind: 'addon', category: categoryIndex, index }} label={addon.label} meta={addonMeta(index)} />
            ))}
          </Branch>
        );
      })}
      <Branch
        context={context}
        node={null}
        label={addonGroups.length > 0 ? t('admin.serviceCatalog.tree.ungrouped') : t('admin.serviceCatalog.tree.addons')}
        meta={t('admin.serviceCatalog.tree.addonCount', { count: ungroupedAddons.length })}
        childProblems={problemsOf(ungroupedAddons.map(({ index }) => ({ kind: 'addon', category: categoryIndex, index })))}
        open={isOpen('ungrouped')}
        onToggle={() => toggle('ungrouped')}
        addLabel={t('admin.serviceCatalog.tree.addAddon')}
        onAdd={() => startAdding('ungrouped')}
        addForm={addFormFor('ungrouped', t('admin.serviceCatalog.tree.newAddonName'), addons, (label) => actions.addAddon(null, label))}
        emptyText={ungroupedAddons.length === 0 ? t('admin.serviceCatalog.tree.emptyGroup') : undefined}
      >
        {ungroupedAddons.map(({ addon, index }) => (
          <ChildRow key={`addon-${index}`} context={context} node={{ kind: 'addon', category: categoryIndex, index }} label={addon.label} meta={addonMeta(index)} />
        ))}
      </Branch>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SectionHeader hint={t('admin.serviceCatalog.tree.featuresHint')} add={addButton(t('admin.serviceCatalog.tree.addFeatureGroup'))} toggle={expandToggle} />
      {addFormFor('section', t('admin.serviceCatalog.tree.newFeatureGroupName'), featureGroups, actions.addFeatureGroup)}
      {featureGroups.length === 0 ? <p style={{ ...muted, margin: 0 }}>{t('admin.serviceCatalog.tree.noFeatureGroups')}</p> : null}
      {featureGroups.map((group, groupIndex) => {
        const id = `featureGroup-${groupIndex}`;
        const members = features.map((feature, index) => ({ feature, index })).filter(({ feature }) => feature.group === group.key);
        return (
          <Branch
            key={id}
            context={context}
            node={{ kind: 'featureGroup', category: categoryIndex, index: groupIndex }}
            label={group.label}
           
            meta={t('admin.serviceCatalog.tree.featureCount', { count: members.length })}
            childProblems={problemsOf(members.map(({ index }) => ({ kind: 'feature', category: categoryIndex, index })))}
            open={isOpen(id)}
            onToggle={() => toggle(id)}
            addLabel={t('admin.serviceCatalog.tree.addFeature')}
            onAdd={() => startAdding(id)}
            addForm={addFormFor(id, t('admin.serviceCatalog.tree.newFeatureName'), features, (label) => actions.addFeature(group.key, label))}
            emptyText={members.length === 0 ? t('admin.serviceCatalog.tree.emptyGroup') : undefined}
          >
            {members.map(({ feature, index }) => (
              <ChildRow key={`feature-${index}`} context={context} node={{ kind: 'feature', category: categoryIndex, index }} label={feature.label} />
            ))}
          </Branch>
        );
      })}
    </div>
  );
}
