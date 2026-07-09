<script lang="ts">
  import {
    aiHistory,
    bindHistoryFile,
    canRedo,
    clearActiveHistory,
    historyDiskSupported,
    historyFile,
    loadHistoryFile,
    restoreBaseline,
    restoreCheckpoint,
    stepBack,
    stepForward
  } from '$/ai/aiHistory.svelte';
  import RestoreIcon from '~icons/material-symbols/settings-backup-restore-rounded';
  import UndoIcon from '~icons/material-symbols/undo-rounded';
  import RedoIcon from '~icons/material-symbols/redo-rounded';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';
  import FolderIcon from '~icons/material-symbols/folder-open-outline-rounded';
  import DeleteIcon from '~icons/material-symbols/delete-outline-rounded';

  // Newest edit first for display, keeping each checkpoint's chronological index
  // so it can be compared against `head`.
  const items = $derived(aiHistory.checkpoints.map((c, i) => ({ c, i })).reverse());

  const relTime = (time: number): string => {
    const secs = Math.max(0, Math.round((Date.now() - time) / 1000));
    if (secs < 45) {
      return 'just now';
    }
    const mins = Math.round(secs / 60);
    if (mins < 60) {
      return `${mins}m ago`;
    }
    const hrs = Math.round(mins / 60);
    if (hrs < 24) {
      return `${hrs}h ago`;
    }
    return `${Math.round(hrs / 24)}d ago`;
  };
</script>

<div class="flex flex-col gap-2 rounded-lg border border-muted bg-background/60 p-2">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold text-foreground">Edit history</span>
    <div class="flex items-center gap-0.5">
      <button
        class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        title="Step back"
        aria-label="Step back one edit"
        disabled={aiHistory.head < 0}
        onclick={stepBack}>
        <UndoIcon class="size-4" />
      </button>
      <button
        class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
        title="Step forward"
        aria-label="Step forward one edit"
        disabled={!canRedo()}
        onclick={stepForward}>
        <RedoIcon class="size-4" />
      </button>
    </div>
  </div>

  {#if items.length === 0}
    <p class="px-1 py-2 text-xs text-muted-foreground">
      AI edits will appear here. Restore any point to rewind the diagram.
    </p>
  {:else}
    <ul class="flex max-h-64 flex-col gap-1 overflow-y-auto">
      {#each items as { c, i } (c.id)}
        <li>
          <button
            class={[
              'group flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors',
              i === aiHistory.head
                ? 'border-accent bg-accent/10'
                : 'border-transparent hover:border-muted hover:bg-muted/50'
            ]}
            title="Restore this version"
            onclick={() => restoreCheckpoint(c.id)}>
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-xs font-medium text-foreground">{c.prompt}</span>
              <span class="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                {relTime(c.time)}
                {#if i === aiHistory.head}
                  <span class="font-semibold text-accent">current</span>
                {:else}
                  <RestoreIcon
                    class="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                {/if}
              </span>
            </div>
            {#if c.summary}
              <span class="truncate text-[11px] text-muted-foreground">{c.summary}</span>
            {/if}
          </button>
        </li>
      {/each}

      <li>
        <button
          class={[
            'flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
            aiHistory.head === -1
              ? 'border-accent bg-accent/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:border-muted hover:bg-muted/50'
          ]}
          title="Restore the diagram to before the first AI edit"
          onclick={restoreBaseline}>
          <RestoreIcon class="size-3.5" />
          Original (before AI)
          {#if aiHistory.head === -1}
            <span class="ml-auto font-semibold text-accent">current</span>
          {/if}
        </button>
      </li>
    </ul>

    <div class="flex items-center justify-between border-t border-muted pt-1.5">
      <div class="flex items-center gap-0.5">
        <button
          class="flex items-center gap-1 rounded p-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title={historyDiskSupported()
            ? 'Save / sync history to a local file'
            : 'Download history as a file'}
          onclick={bindHistoryFile}>
          <SaveIcon class="size-3.5" />
          {historyFile.bound ? 'Synced' : 'Save to file'}
        </button>
        <button
          class="flex items-center gap-1 rounded p-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Load history from a local file"
          onclick={loadHistoryFile}>
          <FolderIcon class="size-3.5" />
          Load
        </button>
      </div>
      <button
        class="flex items-center gap-1 rounded p-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-destructive"
        title="Clear this diagram's AI history"
        onclick={() => {
          if (confirm("Clear this diagram's AI edit history?")) {
            clearActiveHistory();
          }
        }}>
        <DeleteIcon class="size-3.5" />
        Clear
      </button>
    </div>
    {#if historyFile.bound}
      <span class="px-1 text-[10px] text-muted-foreground">Syncing to {historyFile.name}</span>
    {/if}
  {/if}
</div>
