import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Card, useIsMobile } from '../../../shared/components/ui';
import { ApiClientError } from '../../../shared/api/client';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { AlertTriangle, Building2, Check, Clock, Footprints, GraduationCap, Heart, PawPrint, Plus, RefreshCw, Scissors, Send, SlidersHorizontal, Stethoscope } from '../../../shared/icons';
import { useAdminState } from '../context';
import { CatalogTree, sectionOf, type CatalogSection, type TreeActions } from './CatalogTree';
import { NodeEditor } from './NodeEditor';
import { buttonStyle, disabledStyle, Pill, primaryButtonStyle } from './fields';
import {
  addVariant,
  cloneDocument,
  newAddon,
  newCategory,
  newFeature,
  newGroup,
  newService,
  refForIssue,
  removeAddon,
  removeAddonGroup,
  unnamedNodes,
  type NodeRef,
} from './model';
import { discardServiceCatalogDraft, getServiceCatalogAdmin, getServiceCatalogRevisions, publishServiceCatalogDraft, saveServiceCatalogDraft } from './api';
import type { CatalogCategoryDoc, CatalogDocument, CatalogRevisionDto, ServiceCatalogAdminState } from './types';

// "Katalog usług" (F-146): Furli's service catalog - the services, variants, add-ons and provider
// features providers pick from - edited here instead of a file in furli-backend. Changes go to one
// draft; publishing it (only without issues) makes it what providers and customers see at once.

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

const TYPE_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  GROOMER: Scissors,
  WALKER: Footprints,
  PETSITTER: Heart,
  HOTEL: Building2,
  VETERINARIAN: Stethoscope,
  TRAINER: GraduationCap,
};

function TypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? PawPrint;
  return <Icon size={15} />;
}

function move<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function AdminServiceCatalogPage() {
  const { t, locale } = useI18n();
  const { accessToken, showToast } = useAdminState();
  const isMobile = useIsMobile(1100);
  const [state, setState] = useState<ServiceCatalogAdminState | null>(null);
  const [working, setWorking] = useState<CatalogDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<'load' | 'save' | 'publish' | 'discard' | null>('load');
  const [error, setError] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [selected, setSelected] = useState<NodeRef | null>({ kind: 'category', category: 0 });
  const [section, setSection] = useState<CatalogSection>('services');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [revisions, setRevisions] = useState<CatalogRevisionDto[] | null>(null);

  const apply = useCallback((next: ServiceCatalogAdminState) => {
    setState(next);
    setWorking(cloneDocument(next.draft?.document ?? next.published.document));
    setDirty(false);
    setRevisions(null);
  }, []);

  const load = useCallback(async () => {
    setBusy('load');
    setError('');
    try {
      apply(await getServiceCatalogAdmin(accessToken));
    } catch (loadError) {
      setError(loadError instanceof ApiClientError ? loadError.message : t('admin.serviceCatalog.loadFailed'));
    } finally {
      setBusy(null);
    }
  }, [accessToken, apply, t]);

  useEffect(() => { void load(); }, [load]);

  // Unsaved edits live only in this tab - warn before closing it.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // The "add provider type" menu closes on Escape or a click elsewhere.
  useEffect(() => {
    if (!typeMenuOpen) return undefined;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !typeMenuRef.current?.contains(event.target as Node)) setTypeMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [typeMenuOpen]);

  // Issues of the draft as last saved; after local edits they may be out of date until the next save.
  const issues = useMemo(() => state?.draft?.issues ?? [], [state]);
  const stayBasedOf = (type: string) => !!state?.providerTypes.find((candidate) => candidate.type === type)?.stayBased;

  if (!state || !working) {
    return (
      <Card style={{ padding: 22 }}>
        {error ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <span role="alert" style={{ color: C.roseDark, fontSize: 13.5 }}>{error}</span>
            <button type="button" onClick={() => void load()} style={{ ...buttonStyle, justifySelf: 'start' }}><RefreshCw size={14} /> {t('admin.serviceCatalog.retry')}</button>
          </div>
        ) : <span style={{ color: C.textMuted, fontSize: 13.5 }}>{t('admin.serviceCatalog.loading')}</span>}
      </Card>
    );
  }

  const category: CatalogCategoryDoc | undefined = working.categories[categoryIndex];
  const stayBased = category ? stayBasedOf(category.type) : false;

  const edit = (next: CatalogDocument) => {
    setWorking(next);
    setDirty(true);
    setError('');
  };
  const editCategory = (nextCategory: CatalogCategoryDoc) => edit({ ...working, categories: working.categories.map((item, index) => (index === categoryIndex ? nextCategory : item)) });

  const actions: TreeActions = {
    addService: (label) => {
      if (!category) return;
      const services = [...category.services, newService(category, stayBased, label)];
      editCategory({ ...category, services });
      setSelected({ kind: 'service', category: categoryIndex, index: services.length - 1 });
    },
    addVariant: (service, label) => {
      if (!category) return;
      const next = addVariant(category.services[service], stayBased, label);
      editCategory({ ...category, services: category.services.map((item, index) => (index === service ? next : item)) });
      setSelected({ kind: 'variant', category: categoryIndex, service, index: next.variants.length - 1 });
    },
    addAddonGroup: (label) => {
      if (!category) return;
      const addonGroups = [...(category.addonGroups ?? []), newGroup(category.addonGroups, 'grupa-dodatkow', label)];
      editCategory({ ...category, addonGroups });
      setSelected({ kind: 'addonGroup', category: categoryIndex, index: addonGroups.length - 1 });
    },
    addAddon: (groupKey, label) => {
      if (!category) return;
      const addons = [...(category.addons ?? []), newAddon(category, groupKey, label)];
      editCategory({ ...category, addons });
      setSelected({ kind: 'addon', category: categoryIndex, index: addons.length - 1 });
    },
    addFeatureGroup: (label) => {
      if (!category) return;
      const featureGroups = [...(category.featureGroups ?? []), newGroup(category.featureGroups, 'grupa-cech', label)];
      editCategory({ ...category, featureGroups });
      setSelected({ kind: 'featureGroup', category: categoryIndex, index: featureGroups.length - 1 });
    },
    addFeature: (groupKey, label) => {
      if (!category) return;
      const features = [...(category.features ?? []), newFeature(category, groupKey, label)];
      editCategory({ ...category, features });
      setSelected({ kind: 'feature', category: categoryIndex, index: features.length - 1 });
    },
  };

  const remove = () => {
    if (!selected || !category) return;
    switch (selected.kind) {
      case 'category': {
        edit({ ...working, categories: working.categories.filter((_, index) => index !== categoryIndex) });
        setCategoryIndex(0);
        setSelected({ kind: 'category', category: 0 });
        return;
      }
      case 'service':
        editCategory({ ...category, services: category.services.filter((_, index) => index !== selected.index) });
        break;
      case 'variant':
        editCategory({ ...category, services: category.services.map((service, index) => (index === selected.service ? { ...service, variants: service.variants.filter((_, variant) => variant !== selected.index) } : service)) });
        setSelected({ kind: 'service', category: categoryIndex, index: selected.service });
        return;
      case 'addonGroup':
        editCategory(removeAddonGroup(category, selected.index));
        break;
      case 'addon':
        editCategory(removeAddon(category, selected.index));
        break;
      case 'featureGroup':
        editCategory({ ...category, featureGroups: (category.featureGroups ?? []).filter((_, index) => index !== selected.index) });
        break;
      case 'feature':
        editCategory({ ...category, features: (category.features ?? []).filter((_, index) => index !== selected.index) });
        break;
    }
    setSelected({ kind: 'category', category: categoryIndex });
  };

  const reorder = (delta: -1 | 1) => {
    if (!selected || !category) return;
    switch (selected.kind) {
      case 'service':
        if (selected.index + delta < 0 || selected.index + delta >= category.services.length) return;
        editCategory({ ...category, services: move(category.services, selected.index, delta) });
        setSelected({ ...selected, index: selected.index + delta });
        break;
      case 'variant': {
        const service = category.services[selected.service];
        if (selected.index + delta < 0 || selected.index + delta >= service.variants.length) return;
        editCategory({ ...category, services: category.services.map((item, index) => (index === selected.service ? { ...item, variants: move(item.variants, selected.index, delta) } : item)) });
        setSelected({ ...selected, index: selected.index + delta });
        break;
      }
      case 'addon':
        if (selected.index + delta < 0 || selected.index + delta >= (category.addons ?? []).length) return;
        editCategory({ ...category, addons: move(category.addons ?? [], selected.index, delta) });
        setSelected({ ...selected, index: selected.index + delta });
        break;
      case 'feature':
        if (selected.index + delta < 0 || selected.index + delta >= (category.features ?? []).length) return;
        editCategory({ ...category, features: move(category.features ?? [], selected.index, delta) });
        setSelected({ ...selected, index: selected.index + delta });
        break;
      default:
    }
  };

  const addCategory = (type: string) => {
    // A new type starts with the name the panel shows for it; it can be changed in its settings.
    const categories = [...working.categories, newCategory(type, t(`admin.serviceCatalog.providerTypes.${type}`))];
    edit({ ...working, categories });
    setCategoryIndex(categories.length - 1);
    setSelected({ kind: 'category', category: categories.length - 1 });
    setSection('services');
    setTypeMenuOpen(false);
  };

  // Selecting anything - from the structure or from the issues list - shows its type and section.
  const select = (ref: NodeRef) => {
    setCategoryIndex(ref.category);
    setSelected(ref);
    const refSection = sectionOf(ref);
    if (refSection) setSection(refSection);
  };
  const openCategory = (index: number) => {
    setCategoryIndex(index);
    setSelected({ kind: 'category', category: index });
  };

  const handleFailure = async (failure: unknown, fallback: string) => {
    const message = failure instanceof ApiClientError ? failure.message : fallback;
    setError(message);
    // A draft that changed meanwhile, or issues found on publish: the current state tells the rest.
    if (failure instanceof ApiClientError && (failure.status === 409 || failure.status === 422 || failure.status === 404)) {
      try {
        const fresh = await getServiceCatalogAdmin(accessToken);
        if (failure.status === 422) apply(fresh);
        else setState(fresh);
      } catch {
        // keep the message above
      }
    }
  };

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      apply(await saveServiceCatalogDraft(accessToken, working, state.draft?.lockVersion ?? null));
      showToast(t('admin.serviceCatalog.saved'));
    } catch (failure) {
      await handleFailure(failure, t('admin.serviceCatalog.saveFailed'));
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    if (!state.draft) {
      apply(state);
      return;
    }
    if (!window.confirm(t('admin.serviceCatalog.discardConfirm'))) return;
    setBusy('discard');
    try {
      apply(await discardServiceCatalogDraft(accessToken, state.draft.lockVersion));
      openCategory(0);
      showToast(t('admin.serviceCatalog.discarded'));
    } catch (failure) {
      await handleFailure(failure, t('admin.serviceCatalog.discardFailed'));
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!state.draft) return;
    setBusy('publish');
    setConfirmPublish(false);
    try {
      apply(await publishServiceCatalogDraft(accessToken, state.draft.lockVersion));
      showToast(t('admin.serviceCatalog.publishedToast'));
    } catch (failure) {
      await handleFailure(failure, t('admin.serviceCatalog.publishFailed'));
    } finally {
      setBusy(null);
    }
  };

  const loadRevisions = async () => {
    try {
      setRevisions(await getServiceCatalogRevisions(accessToken));
    } catch (failure) {
      setError(failure instanceof ApiClientError ? failure.message : t('admin.serviceCatalog.loadFailed'));
    }
  };

  // A name can be cleared in the editor; such a draft is never saved (every element needs a name).
  const unnamed = unnamedNodes(working);
  const saveBlocked = !dirty || busy !== null || unnamed.length > 0;
  const publishBlocker = !state.draft
    ? t('admin.serviceCatalog.publishNeedsDraft')
    : dirty
      ? t('admin.serviceCatalog.publishNeedsSave')
      : issues.length > 0
        ? t('admin.serviceCatalog.publishNeedsFixes', { count: issues.length })
        : null;
  const availableTypes = state.providerTypes.filter((type) => !working.categories.some((existing) => existing.type === type.type));
  const categoryIssueCount = (index: number) => issues.filter((issue) => issue.path[0] === working.categories[index]?.type).length;
  const sectionIssueCount = (target: CatalogSection) => issues.filter((issue) => {
    const ref = refForIssue(working, issue);
    return !!ref && ref.category === categoryIndex && sectionOf(ref) === target;
  }).length;
  const sections: { key: CatalogSection; label: string; count: number }[] = category ? [
    { key: 'services', label: t('admin.serviceCatalog.tree.services'), count: category.services.length },
    { key: 'addons', label: t('admin.serviceCatalog.tree.addons'), count: (category.addons ?? []).length },
    { key: 'features', label: t('admin.serviceCatalog.tree.features'), count: (category.features ?? []).length },
  ] : [];
  const categorySelected = selected?.kind === 'category' && selected.category === categoryIndex;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
      {/* Status and actions */}
      <Card style={{ minWidth: 0, padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Pill tone="success"><Check size={12} /> {t('admin.serviceCatalog.publishedVersion', { version: state.published.version })}</Pill>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>
            {t('admin.serviceCatalog.publishedMeta', { date: formatDate(state.published.publishedAt, locale), by: state.published.publishedBy ?? t('admin.serviceCatalog.seedAuthor') })}
          </span>
          {state.draft ? (
            <>
              <Pill tone="warning">{t('admin.serviceCatalog.draftVersion', { version: `v${state.draft.revision}` })}</Pill>
              <span style={{ fontSize: 12.5, color: C.textMuted }}>{t('admin.serviceCatalog.draftMeta', { date: formatDate(state.draft.updatedAt, locale), by: state.draft.updatedBy ?? '—' })}</span>
            </>
          ) : null}
          {dirty ? <Pill tone="danger">{t('admin.serviceCatalog.unsaved')}</Pill> : null}
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{t('admin.serviceCatalog.scopeNote')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={() => void save()} disabled={saveBlocked} style={disabledStyle(primaryButtonStyle, saveBlocked)}>
            {busy === 'save' ? t('admin.serviceCatalog.saving') : t('admin.serviceCatalog.saveDraft')}
          </button>
          <button type="button" onClick={() => void discard()} disabled={(!dirty && !state.draft) || busy !== null} style={disabledStyle(buttonStyle, (!dirty && !state.draft) || busy !== null)}>
            {state.draft ? t('admin.serviceCatalog.discardDraft') : t('admin.serviceCatalog.undoChanges')}
          </button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {publishBlocker ? <span style={{ fontSize: 12, color: C.textMuted }}>{publishBlocker}</span> : null}
            {confirmPublish ? (
              <>
                <span style={{ fontSize: 12.5, color: C.text }}>{t('admin.serviceCatalog.publishConfirm')}</span>
                <button type="button" onClick={() => void publish()} disabled={busy !== null} style={{ ...primaryButtonStyle, background: C.green }}><Send size={14} /> {t('admin.serviceCatalog.publishConfirmYes')}</button>
                <button type="button" onClick={() => setConfirmPublish(false)} style={buttonStyle}>{t('common.actions.cancel')}</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmPublish(true)} disabled={!!publishBlocker || busy !== null} style={disabledStyle({ ...primaryButtonStyle, background: C.green }, !!publishBlocker || busy !== null)}>
                <Send size={14} /> {busy === 'publish' ? t('admin.serviceCatalog.publishing') : t('admin.serviceCatalog.publish')}
              </button>
            )}
          </span>
        </div>
        {unnamed.length > 0 ? (
          <div role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13, color: C.roseDark }}>
            <AlertTriangle size={14} /> {t('admin.serviceCatalog.unnamedBlocksSave', { count: unnamed.length })}
            <button type="button" onClick={() => select(unnamed[0])} style={{ ...buttonStyle, padding: '4px 10px', fontSize: 12.5 }}>{t('admin.serviceCatalog.showUnnamed')}</button>
          </div>
        ) : null}
        {error ? <div role="alert" style={{ fontSize: 13, color: C.roseDark }}>{error}</div> : null}
        {issues.length > 0 ? (
          <details open={issues.length <= 6} style={{ background: 'oklch(0.98 0.015 20)', border: '1px solid oklch(0.9 0.05 15)', borderRadius: 12, padding: '10px 12px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.roseDark, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> {t('admin.serviceCatalog.issuesTitle', { count: issues.length })}{dirty ? ` · ${t('admin.serviceCatalog.issuesStale')}` : ''}
            </summary>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
              {issues.map((issue, index) => {
                const ref = refForIssue(working, issue);
                return (
                  <li key={`${issue.code}-${index}`}>
                    <button
                      type="button"
                      disabled={!ref}
                      onClick={() => { if (ref) select(ref); }}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: ref ? 'pointer' : 'default', textAlign: 'left', fontFamily: FONT_BODY, fontSize: 12.5, color: C.text }}
                    >
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: C.textMuted }}>{issue.path.filter(Boolean).join(' › ') || t('admin.serviceCatalog.wholeCatalog')}</span> — {issue.message}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
      </Card>

      {/* Provider types: one tab per type that has a catalog */}
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: `1px solid ${C.border}` }}>
      <nav aria-label={t('admin.serviceCatalog.categories')} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
        {working.categories.map((item, index) => {
          const active = index === categoryIndex;
          const problems = categoryIssueCount(index);
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => openCategory(index)}
              aria-current={active ? 'page' : undefined}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: -1, border: 'none', borderBottom: `2px solid ${active ? C.primary : 'transparent'}`, background: 'transparent', color: active ? C.text : C.textMedium, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 14, fontWeight: active ? 700 : 600, whiteSpace: 'nowrap' }}
            >
              <TypeIcon type={item.type} />
              {item.label || t(`admin.serviceCatalog.providerTypes.${item.type}`)}
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted }}>{item.services.length}</span>
              {problems > 0 ? <span title={t('admin.serviceCatalog.tree.issuesTitle', { count: problems })} style={{ display: 'flex', color: C.roseDark }}><AlertTriangle size={13} /></span> : null}
            </button>
          );
        })}
      </nav>
        {category ? (
          <button type="button" onClick={() => openCategory(categoryIndex)} aria-pressed={categorySelected} aria-label={t('admin.serviceCatalog.typeSettings')} title={t('admin.serviceCatalog.typeSettings')} style={{ ...buttonStyle, flexShrink: 0, marginBottom: 6, whiteSpace: 'nowrap', ...(categorySelected ? { border: `1px solid ${C.primary}`, color: C.amber } : {}) }}>
            <SlidersHorizontal size={14} /> {isMobile ? null : t('admin.serviceCatalog.typeSettings')}
          </button>
        ) : null}
        {availableTypes.length > 0 ? (
          <div ref={typeMenuRef} style={{ position: 'relative', flexShrink: 0, paddingBottom: 6 }}>
            <button type="button" onClick={() => setTypeMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={typeMenuOpen} aria-label={t('admin.serviceCatalog.addCategory')} title={t('admin.serviceCatalog.addCategory')} style={{ ...buttonStyle, whiteSpace: 'nowrap' }}>
              <Plus size={14} /> {isMobile ? null : t('admin.serviceCatalog.addCategory')}
            </button>
            {typeMenuOpen ? (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20, width: 300, maxWidth: 'calc(100vw - 32px)', background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,.12)', padding: 8 }}>
                <p style={{ margin: '4px 8px 8px', fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>{t('admin.serviceCatalog.addCategoryHint')}</p>
                <div role="menu" aria-label={t('admin.serviceCatalog.addCategory')} style={{ display: 'grid', gap: 2 }}>
                  {availableTypes.map((type) => (
                    <button key={type.type} type="button" role="menuitem" onClick={() => addCategory(type.type)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent', color: C.text, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, textAlign: 'left' }}>
                      <TypeIcon type={type.type} /> {t(`admin.serviceCatalog.providerTypes.${type.type}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {category ? (
        <div style={{ minWidth: 0, display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 16, alignItems: 'start' }}>
          {/* Structure of the type, one section at a time */}
          <Card style={{ minWidth: 0, padding: 16, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div role="tablist" aria-label={t('admin.serviceCatalog.sections')} style={{ flex: 1, display: 'flex', flexWrap: 'wrap', padding: 3, gap: 2, borderRadius: 12, background: C.bgMuted }}>
                {sections.map((item) => {
                  const active = item.key === section;
                  const problems = sectionIssueCount(item.key);
                  return (
                    <button key={item.key} type="button" role="tab" aria-selected={active} onClick={() => setSection(item.key)} style={{ flex: '1 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 9, whiteSpace: 'nowrap', border: 'none', background: active ? C.bgCard : 'transparent', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none', color: active ? C.text : C.textMedium, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700 }}>
                      {item.label}
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textMuted }}>{item.count}</span>
                      {problems > 0 ? <span style={{ display: 'flex', color: C.roseDark }}><AlertTriangle size={12} /></span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <CatalogTree key={categoryIndex} document={working} categoryIndex={categoryIndex} section={section} stayBased={stayBased} selected={selected} onSelect={select} issues={issues} usage={state.usage} actions={actions} />
          </Card>

          {/* The selected element stays in view while the structure scrolls */}
          <Card style={{ minWidth: 0, padding: 18, position: isMobile ? 'static' : 'sticky', top: 16 }}>
            {selected && selected.category === categoryIndex ? (
              <NodeEditor
                document={working}
                published={state.published.document}
                node={selected}
                stayBased={stayBased}
                usage={state.usage}
                issues={issues}
                onChange={editCategory}
                onRemove={remove}
                onMove={reorder}
              />
            ) : <p style={{ fontSize: 13, color: C.textMuted }}>{t('admin.serviceCatalog.selectHint')}</p>}
          </Card>
        </div>
      ) : (
        <Card style={{ padding: 22 }}><p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>{t('admin.serviceCatalog.noCategories')}</p></Card>
      )}

      <Card style={{ minWidth: 0, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color={C.textMedium} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{t('admin.serviceCatalog.history')}</span>
          {revisions === null ? <button type="button" onClick={() => void loadRevisions()} style={{ ...buttonStyle, marginLeft: 'auto' }}>{t('admin.serviceCatalog.showHistory')}</button> : null}
        </div>
        {revisions ? (
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {revisions.map((revision) => (
              <li key={revision.revision} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
                <b style={{ minWidth: 34 }}>{revision.version}</b>
                <Pill tone={revision.status === 'PUBLISHED' ? 'success' : revision.status === 'DRAFT' ? 'warning' : 'neutral'}>{t(`admin.serviceCatalog.status.${revision.status}`)}</Pill>
                <span style={{ color: C.textMuted }}>{formatDate(revision.publishedAt ?? revision.updatedAt, locale)}</span>
                <span style={{ color: C.textMuted }}>{revision.author ?? t('admin.serviceCatalog.seedAuthor')}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

