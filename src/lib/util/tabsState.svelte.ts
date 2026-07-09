/**
 * Multi-tab layer on top of the singleton document state.
 *
 * The app was built around one live document (`inputState` in
 * `state.svelte.ts`, mirrored to `localStorage['codeStore']`). Rather than
 * rewrite that, we treat the singleton as "whatever the active tab is showing"
 * and keep every *other* tab's document parked in its own localStorage slot.
 *
 *   - `tabsMeta`         → { tabs: [{id,title,auto}], activeId }  (reactive)
 *   - `tabState:<id>`    → the full State for each tab
 *
 * A persist listener registered with the state module mirrors every edit of
 * the active document into its slot, so the parked copies never go stale and
 * a crash/refresh restores exactly what was on screen.
 */

import type { State } from '$/types';
import { v4 as uuidV4 } from 'uuid';
import { removeTimeline } from '$/ai/aiHistory.svelte';
import { persisted, readJSON, writeJSON } from './persist.svelte';
import { deserializeState } from './serde';
import {
  defaultState,
  inputState,
  loadState,
  replaceInputState,
  setPersistListener,
  updateCodeStore
} from './state.svelte';

export interface TabMeta {
  id: string;
  title: string;
  /** Title tracks the diagram's first line until the user renames it. */
  auto: boolean;
}

interface TabsMeta {
  tabs: TabMeta[];
  activeId: string;
}

const TAB_STATE_PREFIX = 'tabState:';
const slotKey = (id: string): string => `${TAB_STATE_PREFIX}${id}`;

const readTabState = (id: string): State => readJSON<State>(slotKey(id), { ...defaultState });
const writeTabState = (id: string, state: State): void => writeJSON(slotKey(id), state);
const removeTabState = (id: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(slotKey(id));
  }
};

const snapshotInput = (): State => $state.snapshot(inputState) as State;

// Identity of a document, ignoring view-only fields (pan/zoom/renderCount).
const docKey = (s: State): string => JSON.stringify({ code: s.code, mermaid: s.mermaid });

const deriveTitle = (code: string): string => {
  const line = code
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('%%'));
  if (!line) {
    return 'Untitled';
  }
  const compact = line.replace(/\s+/g, ' ');
  return compact.length > 24 ? `${compact.slice(0, 24)}…` : compact;
};

const meta = persisted<TabsMeta>('tabsMeta', { tabs: [], activeId: '' });

/** Reactive, read-only view for components. */
export const tabsState = {
  get tabs(): TabMeta[] {
    return meta.value.tabs;
  },
  get activeId(): string {
    return meta.value.activeId;
  }
};

// --- internal helpers -------------------------------------------------------

const setMeta = (next: TabsMeta): void => {
  meta.value = next;
};

const parkActive = (): void => {
  const { activeId } = meta.value;
  if (activeId) {
    writeTabState(activeId, snapshotInput());
  }
};

// Load a tab's parked document into the live editor and force a render.
const activate = (id: string): void => {
  replaceInputState(readTabState(id));
  updateCodeStore({ updateDiagram: true });
};

// Registered with the state module: fires after every edit of the live doc.
const mirrorActive = (snapshot: State): void => {
  const m = meta.value;
  if (!m.activeId) {
    return;
  }
  writeTabState(m.activeId, snapshot);
  const idx = m.tabs.findIndex((t) => t.id === m.activeId);
  if (idx >= 0 && m.tabs[idx].auto) {
    const title = deriveTitle(snapshot.code);
    if (title !== m.tabs[idx].title) {
      const tabs = m.tabs.slice();
      tabs[idx] = { ...tabs[idx], title };
      setMeta({ ...m, tabs });
    }
  }
};

// --- public API -------------------------------------------------------------

/**
 * Create a tab (optionally seeded with a document) and switch to it.
 * Pass `opts.title` to pin an explicit title (e.g. a filename) that won't be
 * overwritten by the auto-derived one.
 */
export const newTab = (state?: State, opts?: { title?: string }): string => {
  const id = uuidV4();
  const seed = state ?? { ...defaultState };
  parkActive();
  writeTabState(id, seed);
  const m = meta.value;
  const title = opts?.title ?? deriveTitle(seed.code);
  setMeta({
    tabs: [...m.tabs, { id, title, auto: opts?.title === undefined }],
    activeId: id
  });
  activate(id);
  return id;
};

/** Open a copy of the active document in a new tab. */
export const duplicateActiveTab = (): string => newTab(snapshotInput());

export const switchTab = (id: string): void => {
  const m = meta.value;
  if (id === m.activeId || !m.tabs.some((t) => t.id === id)) {
    return;
  }
  parkActive();
  setMeta({ ...m, activeId: id });
  activate(id);
};

export const closeTab = (id: string): void => {
  const m = meta.value;
  const idx = m.tabs.findIndex((t) => t.id === id);
  if (idx < 0) {
    return;
  }
  const remaining = m.tabs.filter((t) => t.id !== id);
  removeTabState(id);
  removeTimeline(id);

  if (remaining.length === 0) {
    // Never leave zero tabs open.
    const newId = uuidV4();
    const seed = { ...defaultState };
    writeTabState(newId, seed);
    setMeta({ tabs: [{ id: newId, title: deriveTitle(seed.code), auto: true }], activeId: newId });
    activate(newId);
    return;
  }

  const wasActive = id === m.activeId;
  const nextActive = wasActive
    ? remaining[Math.min(idx, remaining.length - 1)].id
    : m.activeId;
  setMeta({ tabs: remaining, activeId: nextActive });
  if (wasActive) {
    activate(nextActive);
  }
};

export const renameTab = (id: string, title: string): void => {
  const m = meta.value;
  const trimmed = title.trim();
  setMeta({
    ...m,
    tabs: m.tabs.map((t) =>
      t.id === id ? { ...t, title: trimmed || t.title, auto: trimmed.length === 0 } : t
    )
  });
};

/** Reorder by dropping `fromId` onto `toId`. */
export const reorderTabs = (fromId: string, toId: string): void => {
  const m = meta.value;
  const from = m.tabs.findIndex((t) => t.id === fromId);
  const to = m.tabs.findIndex((t) => t.id === toId);
  if (from < 0 || to < 0 || from === to) {
    return;
  }
  const tabs = m.tabs.slice();
  const [moved] = tabs.splice(from, 1);
  tabs.splice(to, 0, moved);
  setMeta({ ...m, tabs });
};

/** Called once on mount: migrate legacy single-doc state and wire mirroring. */
export const initTabs = (): void => {
  setPersistListener(mirrorActive);
  const m = meta.value;
  if (m.tabs.length === 0) {
    // First run with tabs: adopt the existing single document as tab #1.
    const id = uuidV4();
    const seed = snapshotInput();
    writeTabState(id, seed);
    setMeta({ tabs: [{ id, title: deriveTitle(seed.code), auto: true }], activeId: id });
  } else if (!m.tabs.some((t) => t.id === m.activeId)) {
    setMeta({ ...m, activeId: m.tabs[0].id });
  }
};

/**
 * Reconcile the URL hash with the open tabs on load / hashchange.
 * A hash equal to the active tab is a normal reload; a different one is a
 * shared/foreign diagram, which we open in a new tab so nothing is lost.
 */
export const loadIntoTabs = (): void => {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    const active = readTabState(meta.value.activeId);
    if (docKey(active) !== docKey(snapshotInput())) {
      activate(meta.value.activeId);
    }
    return;
  }

  let hashState: State | undefined;
  try {
    hashState = deserializeState(hash);
  } catch {
    hashState = undefined;
  }
  if (!hashState) {
    loadState(hash); // let the existing loader show its parse-failed diagram
    return;
  }

  const active = readTabState(meta.value.activeId);
  if (docKey(active) === docKey(hashState)) {
    if (docKey(active) !== docKey(snapshotInput())) {
      activate(meta.value.activeId);
    }
    return;
  }

  // Foreign diagram. Reuse a lone, untouched default tab instead of stacking.
  const m = meta.value;
  if (m.tabs.length === 1 && docKey(readTabState(m.tabs[0].id)) === docKey(defaultState)) {
    writeTabState(m.tabs[0].id, hashState);
    setMeta({
      tabs: [{ ...m.tabs[0], title: deriveTitle(hashState.code), auto: true }],
      activeId: m.tabs[0].id
    });
    activate(m.tabs[0].id);
    return;
  }
  newTab(hashState);
};
