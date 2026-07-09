/**
 * Save / open real `.mmd` files on disk via the File System Access API, with
 * graceful fallbacks (a hidden <input type=file> for opening and a Blob
 * download for saving) on browsers that lack it (Firefox / Safari).
 *
 * Files hold just the Mermaid source (`state.code`) — the standard `.mmd`
 * shape. Per-diagram config (theme etc.) stays with the tab but isn't written
 * into the file.
 */

import type { State } from '$/types';
import { notify } from './notify';
import { defaultState, inputState } from './state.svelte';
import { newTab, renameTab, tabsState } from './tabsState.svelte';

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

export const fileAccessSupported = (): boolean =>
  typeof window !== 'undefined' && 'showSaveFilePicker' in window;

const pickerTypes = [
  {
    description: 'Mermaid diagram',
    accept: { 'text/plain': ['.mmd', '.mermaid', '.txt', '.md'] }
  }
];

// FileSystemFileHandles can't be JSON-persisted, so bindings live in memory for
// the session. After a reload a tab keeps its content and filename title, but
// the disk link is re-established on the next save.
const handles = new Map<string, FSFileHandle>();

export const isFileBound = (id: string): boolean => handles.has(id);

const activeCode = (): string => inputState.code;

const sanitizeFileName = (title: string): string => {
  const base =
    title.replace(/\.(mmd|mermaid|txt|md)$/i, '').replace(/[^\w.-]+/g, '_') || 'diagram';
  return `${base}.mmd`;
};

const suggestedName = (id: string): string => {
  const title = tabsState.tabs.find((t) => t.id === id)?.title ?? 'diagram';
  return /\.(mmd|mermaid|txt|md)$/i.test(title) ? title : sanitizeFileName(title);
};

const seedState = (code: string): State => ({ ...defaultState, code });

const writeHandle = async (handle: FSFileHandle, contents: string): Promise<void> => {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

// --- Open -------------------------------------------------------------------

const openViaInput = (): void => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.mmd,.mermaid,.txt,.md,text/plain';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void file.text().then((text) => {
      newTab(seedState(text), { title: file.name });
      notify(`Opened ${file.name}`);
    });
  });
  input.click();
};

export const openFile = async (): Promise<void> => {
  const picker = fsWindow().showOpenFilePicker;
  if (!fileAccessSupported() || !picker) {
    openViaInput();
    return;
  }
  try {
    const [handle] = await picker({ types: pickerTypes, multiple: false });
    const file = await handle.getFile();
    const text = await file.text();
    const id = newTab(seedState(text), { title: file.name });
    handles.set(id, handle);
    notify(`Opened ${file.name}`);
  } catch (error) {
    if (!isAbort(error)) {
      console.error('Open failed', error);
    }
  }
};

// --- Save -------------------------------------------------------------------

const downloadFile = (name: string, contents: string): void => {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const saveActiveAs = async (): Promise<void> => {
  const id = tabsState.activeId;
  const code = activeCode();
  const name = suggestedName(id);
  const picker = fsWindow().showSaveFilePicker;
  if (!fileAccessSupported() || !picker) {
    downloadFile(name, code);
    notify(`Downloaded ${name}`);
    return;
  }
  try {
    const handle = await picker({ suggestedName: name, types: pickerTypes });
    await writeHandle(handle, code);
    handles.set(id, handle);
    renameTab(id, handle.name);
    notify(`Saved ${handle.name}`);
  } catch (error) {
    if (!isAbort(error)) {
      console.error('Save As failed', error);
    }
  }
};

export const saveActive = async (): Promise<void> => {
  const id = tabsState.activeId;
  const handle = handles.get(id);
  if (fileAccessSupported() && handle) {
    try {
      await writeHandle(handle, activeCode());
      notify(`Saved ${handle.name}`);
    } catch (error) {
      if (!isAbort(error)) {
        console.error('Save failed', error);
      }
    }
    return;
  }
  await saveActiveAs();
};
