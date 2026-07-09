/**
 * AI edit history + rewind. Every successful AI edit records a checkpoint
 * capturing the prompt, the model's summary, and the diagram code *before* and
 * *after* the edit. The user can step back and forward through these — a
 * lightweight, UI-driven version of Claude Code's `/rewind`, scoped per tab.
 *
 * Timeline model (per tab, chronological / oldest-first):
 *   checkpoints: [c0, c1, c2, ...]
 *   head:  index of the checkpoint whose result is currently on screen,
 *          or -1 meaning "baseline" (the diagram as it was before c0).
 *
 * Restoring an earlier checkpoint moves `head` back but keeps the later ones as
 * a redo tail; making a *new* AI edit from a rewound position truncates that
 * tail (classic undo/redo semantics).
 *
 * Persistence: always mirrored to localStorage (`aiHistoryStore`). Optionally
 * also mirrored to a real file on disk via the File System Access API — this is
 * a local tool, so the on-disk JSON is a plain, inspectable backup. The file
 * handle can't survive a reload (handles aren't serialisable), so after a
 * refresh localStorage is the source of truth until the file is re-bound.
 */

import { debounce } from 'lodash-es';
import { v4 as uuidV4 } from 'uuid';
import { notify } from '$/util/notify';
import { persisted } from '$/util/persist.svelte';
import { updateCode, validatedState } from '$/util/state.svelte';
import { tabsState } from '$/util/tabsState.svelte';

export interface AiCheckpoint {
  id: string;
  time: number;
  prompt: string;
  summary: string;
  model: string;
  beforeCode: string;
  afterCode: string;
  diagramType?: string;
}

export interface AiTimeline {
  checkpoints: AiCheckpoint[];
  /** Index of the applied checkpoint; -1 = baseline (before the first edit). */
  head: number;
}

interface AiHistoryStore {
  version: 1;
  timelines: Record<string, AiTimeline>;
}

// Keep timelines bounded so localStorage can't grow without limit.
const MAX_CHECKPOINTS = 100;

// How many recent edits to replay as conversation context (bounds token cost).
export const AI_CONTEXT_WINDOW = 5;

const store = persisted<AiHistoryStore>('aiHistoryStore', { version: 1, timelines: {} });

const emptyTimeline = (): AiTimeline => ({ checkpoints: [], head: -1 });

const timelineFor = (tabId: string): AiTimeline => store.value.timelines[tabId] ?? emptyTimeline();

// Replace one tab's timeline wholesale (persisted state is raw / whole-value).
const writeTimeline = (tabId: string, timeline: AiTimeline): void => {
  store.value = {
    ...store.value,
    timelines: { ...store.value.timelines, [tabId]: timeline }
  };
  scheduleDiskWrite();
};

// --- reactive, read-only view for the active tab -----------------------------

export const aiHistory = {
  /** Checkpoints for the active tab, oldest-first. */
  get checkpoints(): AiCheckpoint[] {
    return timelineFor(tabsState.activeId).checkpoints;
  },
  /** Index of the applied checkpoint (-1 = baseline / before the first edit). */
  get head(): number {
    return timelineFor(tabsState.activeId).head;
  },
  get hasHistory(): boolean {
    return this.checkpoints.length > 0;
  }
};

// --- recording & rewind ------------------------------------------------------

export const recordCheckpoint = (entry: {
  prompt: string;
  summary: string;
  model: string;
  beforeCode: string;
  afterCode: string;
  diagramType?: string;
}): void => {
  const tabId = tabsState.activeId;
  if (!tabId) {
    return;
  }
  const timeline = timelineFor(tabId);
  // Drop any redo tail: a fresh edit supersedes rewound-past checkpoints.
  const kept = timeline.checkpoints.slice(0, timeline.head + 1);
  const checkpoint: AiCheckpoint = { id: uuidV4(), time: Date.now(), ...entry };
  let next = [...kept, checkpoint];
  if (next.length > MAX_CHECKPOINTS) {
    next = next.slice(next.length - MAX_CHECKPOINTS);
  }
  writeTimeline(tabId, { checkpoints: next, head: next.length - 1 });
};

// Apply a code string to the live document without recording a new checkpoint.
const applyCode = (code: string): void => updateCode(code, { updateDiagram: true });

/** Restore the diagram to the state produced by checkpoint `id`. */
export const restoreCheckpoint = (id: string): void => {
  const tabId = tabsState.activeId;
  const timeline = timelineFor(tabId);
  const index = timeline.checkpoints.findIndex((c) => c.id === id);
  if (index < 0) {
    return;
  }
  applyCode(timeline.checkpoints[index].afterCode);
  writeTimeline(tabId, { ...timeline, head: index });
};

/** Restore the diagram to how it was before the first AI edit. */
export const restoreBaseline = (): void => {
  const tabId = tabsState.activeId;
  const timeline = timelineFor(tabId);
  if (timeline.checkpoints.length === 0) {
    return;
  }
  applyCode(timeline.checkpoints[0].beforeCode);
  writeTimeline(tabId, { ...timeline, head: -1 });
};

/** True when there is a checkpoint after the current head to redo to. */
export const canRedo = (): boolean => {
  const timeline = timelineFor(tabsState.activeId);
  return timeline.head < timeline.checkpoints.length - 1;
};

/** Step one checkpoint back (toward baseline). */
export const stepBack = (): void => {
  const timeline = timelineFor(tabsState.activeId);
  if (timeline.head < 0) {
    return;
  }
  const target = timeline.head - 1;
  if (target < 0) {
    restoreBaseline();
  } else {
    restoreCheckpoint(timeline.checkpoints[target].id);
  }
};

/** Step one checkpoint forward (toward the latest edit). */
export const stepForward = (): void => {
  const timeline = timelineFor(tabsState.activeId);
  if (timeline.head >= timeline.checkpoints.length - 1) {
    return;
  }
  restoreCheckpoint(timeline.checkpoints[timeline.head + 1].id);
};

export const clearActiveHistory = (): void => {
  const tabId = tabsState.activeId;
  if (!store.value.timelines[tabId]) {
    return;
  }
  const timelines = { ...store.value.timelines };
  delete timelines[tabId];
  store.value = { ...store.value, timelines };
  scheduleDiskWrite();
};

/** Drop a tab's timeline when its tab is closed (called from tabsState). */
export const removeTimeline = (tabId: string): void => {
  if (!store.value.timelines[tabId]) {
    return;
  }
  const timelines = { ...store.value.timelines };
  delete timelines[tabId];
  store.value = { ...store.value, timelines };
  scheduleDiskWrite();
};

// --- optional on-disk mirror (File System Access API) ------------------------

interface FSWritable {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}
interface FSFileHandle {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FSWritable>;
}
interface FSWindow {
  showOpenFilePicker?: (opts?: unknown) => Promise<FSFileHandle[]>;
  showSaveFilePicker?: (opts?: unknown) => Promise<FSFileHandle>;
}
const fsWindow = (): FSWindow => window as unknown as FSWindow;

export const historyDiskSupported = (): boolean =>
  typeof window !== 'undefined' && 'showSaveFilePicker' in window;

// The bound handle lives only for the session (handles aren't serialisable).
let fileHandle: FSFileHandle | undefined;
let bound = $state(false);
let boundName = $state('');

export const historyFile = {
  get bound(): boolean {
    return bound;
  },
  get name(): string {
    return boundName;
  }
};

const pickerTypes = [
  { description: 'Mermade AI history', accept: { 'application/json': ['.json'] } }
];

const serialize = (): string => JSON.stringify(store.value, null, 2);

const writeToDisk = async (): Promise<void> => {
  if (!fileHandle) {
    return;
  }
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(serialize());
    await writable.close();
  } catch (error) {
    console.error('Failed to sync AI history to disk', error);
    bound = false;
    fileHandle = undefined;
    notify('Lost the AI-history file link; re-bind to keep syncing.');
  }
};

const scheduleDiskWrite = debounce(() => void writeToDisk(), 500);

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/** Pick (or create) a file to mirror AI history into, and write it now. */
export const bindHistoryFile = async (): Promise<void> => {
  const picker = fsWindow().showSaveFilePicker;
  if (!picker) {
    downloadHistory();
    return;
  }
  try {
    fileHandle = await picker({ suggestedName: 'mermade-ai-history.json', types: pickerTypes });
    bound = true;
    boundName = fileHandle.name;
    await writeToDisk();
    notify(`Syncing AI history to ${fileHandle.name}`);
  } catch (error) {
    if (!isAbort(error)) {
      console.error(error);
      notify('Could not open the history file.');
    }
  }
};

// Merge an imported store into the current one; incoming timelines win.
const mergeStore = (incoming: unknown): void => {
  if (
    !incoming ||
    typeof incoming !== 'object' ||
    !('timelines' in incoming) ||
    typeof (incoming as AiHistoryStore).timelines !== 'object'
  ) {
    notify('That file is not a Mermade AI-history file.');
    return;
  }
  const merged = {
    ...store.value.timelines,
    ...(incoming as AiHistoryStore).timelines
  };
  store.value = { version: 1, timelines: merged };
  scheduleDiskWrite();
  notify('Loaded AI history from file.');
};

/** Load a history file from disk and merge it into the current history. */
export const loadHistoryFile = async (): Promise<void> => {
  const picker = fsWindow().showOpenFilePicker;
  if (!picker) {
    importHistoryViaInput();
    return;
  }
  try {
    const [handle] = await picker({ types: pickerTypes, multiple: false });
    const text = await (await handle.getFile()).text();
    fileHandle = handle;
    bound = true;
    boundName = handle.name;
    mergeStore(JSON.parse(text));
  } catch (error) {
    if (!isAbort(error)) {
      console.error(error);
      notify('Could not read the history file.');
    }
  }
};

// --- fallbacks for browsers without the File System Access API ---------------

export const downloadHistory = (): void => {
  const blob = new Blob([serialize()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mermade-ai-history.json';
  a.click();
  URL.revokeObjectURL(url);
};

const importHistoryViaInput = (): void => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void file.text().then((text) => {
      try {
        mergeStore(JSON.parse(text));
      } catch {
        notify('That file is not valid JSON.');
      }
    });
  });
  input.click();
};

// Convenience for the panel: the code we last sent to the model = current code.
export const currentCode = (): string => validatedState.current.code;
