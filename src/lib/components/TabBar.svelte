<script lang="ts">
  import {
    closeTab,
    newTab,
    renameTab,
    reorderTabs,
    switchTab,
    tabsState
  } from '$/util/tabsState.svelte';
  import AddIcon from '~icons/material-symbols/add-2-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';

  let editingId = $state<string | null>(null);
  let editValue = $state('');
  let dragId = $state<string | null>(null);

  const startRename = (id: string, title: string) => {
    editingId = id;
    editValue = title;
  };

  const commitRename = () => {
    if (editingId) {
      renameTab(editingId, editValue);
    }
    editingId = null;
  };

  // `autofocus` is unreliable; focus + select the field when it mounts.
  const focusSelect = (node: HTMLInputElement) => {
    node.focus();
    node.select();
  };
</script>

<div class="flex items-center gap-1 overflow-x-auto border-b border-border px-2 py-1">
  {#each tabsState.tabs as tab (tab.id)}
    <div
      role="tab"
      tabindex="0"
      aria-selected={tab.id === tabsState.activeId}
      draggable={editingId !== tab.id}
      ondragstart={() => (dragId = tab.id)}
      ondragover={(e) => e.preventDefault()}
      ondrop={() => {
        if (dragId) {
          reorderTabs(dragId, tab.id);
        }
        dragId = null;
      }}
      onclick={() => switchTab(tab.id)}
      ondblclick={() => startRename(tab.id, tab.title)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          switchTab(tab.id);
        }
      }}
      class={[
        'group flex max-w-52 min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border py-1 pr-1 pl-2.5 text-sm select-none',
        tab.id === tabsState.activeId
          ? 'border-border-dark bg-card text-foreground shadow-sm'
          : 'border-transparent text-muted-foreground hover:bg-muted'
      ]}>
      {#if editingId === tab.id}
        <input
          class="w-32 bg-transparent outline-none"
          bind:value={editValue}
          use:focusSelect
          onclick={(e) => e.stopPropagation()}
          onblur={commitRename}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              commitRename();
            } else if (e.key === 'Escape') {
              editingId = null;
            }
          }} />
      {:else}
        <span class="truncate" title={tab.title}>{tab.title}</span>
      {/if}
      <button
        class="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-border-dark hover:text-destructive"
        title="Close tab"
        aria-label="Close tab"
        onclick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}>
        <CloseIcon class="size-3.5" />
      </button>
    </div>
  {/each}
  <button
    class="ml-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
    title="New diagram"
    aria-label="New diagram"
    onclick={() => newTab()}>
    <AddIcon class="size-4" />
  </button>
</div>
