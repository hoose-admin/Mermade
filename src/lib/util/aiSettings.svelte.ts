/**
 * Gemini API key + AI settings. The key lives only in this browser's
 * localStorage and is sent directly to Google's Generative Language API.
 */
import { persisted } from './persist.svelte';

const keyStore = persisted<string>('geminiApiKey', '');

// "Remember my key": when true (the default) the key is persisted to
// localStorage as before. When false the key lives ONLY in `sessionKey` below —
// in memory, gone on tab close, never written to disk. This is the safer choice
// on a shared or public machine.
const rememberStore = persisted<boolean>('aiRememberKey', true);

// The in-memory key, used when "remember" is off. Module-level $state is fine in
// a .svelte.ts file (same as `dialogOpen` below).
let sessionKey = $state('');

// Enforce the invariant on load: if "remember" is off, no key may sit on disk.
// (Normally the setters keep it clean, but this guards a leftover from a crash,
// a manual localStorage edit, or an older build.)
if (!rememberStore.value && keyStore.value) {
  keyStore.value = '';
}

const currentKey = (): string => (rememberStore.value ? keyStore.value : sessionKey);
// The user-editable AI context now lives per-diagram in the "AI Context" editor
// tab (`State.aiContext`), not here — see `src/lib/ai/skill.ts` and
// `updateContext` in state.svelte. The legacy global `aiUserStyle` value is
// migrated into the active diagram once by `migrateLegacyAiContext`.
// Conversational mode: feed the recent AI edits (see aiHistory) as prior turns
// so follow-ups like "undo that" / "make it bigger" resolve. On by default.
const conversationalStore = persisted<boolean>('aiConversational', true);

// The key dialog is a transient modal — fine to reset on reload.
let dialogOpen = $state(false);
// The AI panel's open-state is persisted so a dev-server reload (or a normal
// page refresh) doesn't close the panel out from under the user mid-task.
const panelStore = persisted<boolean>('aiPanelOpen', false);

export const aiSettings = {
  get key(): string {
    return currentKey();
  },
  set key(value: string) {
    const trimmed = value.trim();
    // Always hold the key in memory so it's usable this session; only mirror it
    // to disk when "remember" is on. Setting '' (Clear) scrubs both.
    sessionKey = trimmed;
    keyStore.value = rememberStore.value ? trimmed : '';
  },
  get hasKey(): boolean {
    return currentKey().trim().length > 0;
  },
  get remember(): boolean {
    return rememberStore.value;
  },
  set remember(value: boolean) {
    if (value === rememberStore.value) {
      return;
    }
    // Migrate the current key across the storage boundary so toggling never
    // loses it mid-session: on -> persist what we hold; off -> keep it in memory
    // and scrub disk.
    const held = currentKey();
    rememberStore.value = value;
    sessionKey = held;
    keyStore.value = value ? held : '';
  },
  get conversational(): boolean {
    return conversationalStore.value;
  },
  set conversational(value: boolean) {
    conversationalStore.value = value;
  }
};

export const aiKeyDialog = {
  get open(): boolean {
    return dialogOpen;
  },
  set open(value: boolean) {
    dialogOpen = value;
  }
};

export const aiPanel = {
  get open(): boolean {
    return panelStore.value;
  },
  set open(value: boolean) {
    panelStore.value = value;
  }
};
