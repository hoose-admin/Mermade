/**
 * Gemini API key + AI settings. The key lives only in this browser's
 * localStorage and is sent directly to Google's Generative Language API.
 */
import { persisted } from './persist.svelte';

const keyStore = persisted<string>('geminiApiKey', '');
// The user-editable layer of the AI "skill": free-form standing preferences
// (tone, conventions, defaults) appended to every system prompt. See
// `src/lib/ai/skill.ts` for how it is composed into the final prompt.
const styleStore = persisted<string>('aiUserStyle', '');
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
    return keyStore.value;
  },
  set key(value: string) {
    keyStore.value = value.trim();
  },
  get hasKey(): boolean {
    return keyStore.value.trim().length > 0;
  },
  get style(): string {
    return styleStore.value;
  },
  set style(value: string) {
    styleStore.value = value;
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
