<script lang="ts">
  import * as Popover from '$/components/ui/popover';
  import { env } from '$/util/env';
  import { openFile, saveActive, saveActiveAs } from '$/util/fileAccess.svelte';
  import { urls } from '$/util/state.svelte';
  import { cmdKey } from '$/util/util';
  import { cn } from '$/utils';
  import type { Component, Snippet } from 'svelte';
  import MermaidTailIcon from '~icons/custom/mermaid-tail';
  import AddIcon from '~icons/material-symbols/add-2-rounded';
  import BookIcon from '~icons/material-symbols/book-2-outline-rounded';
  import DuplicateIcon from '~icons/material-symbols/content-copy-outline-rounded';
  import FolderOpenIcon from '~icons/material-symbols/folder-open-outline-rounded';
  import MenuIcon from '~icons/material-symbols/menu-rounded';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';
  import SaveAsIcon from '~icons/material-symbols/save-as-outline-rounded';

  interface ActionItem {
    label: string;
    icon: Component;
    onclick: () => void;
    isSectionEnd?: boolean;
  }

  const fileItems: ActionItem[] = [
    { label: 'Open file…', icon: FolderOpenIcon, onclick: () => void openFile() },
    { label: `Save   ${cmdKey}+S`, icon: SaveIcon, onclick: () => void saveActive() },
    { label: 'Save as…', icon: SaveAsIcon, onclick: () => void saveActiveAs(), isSectionEnd: true }
  ];

  interface MenuItem {
    label: string;
    icon: Component;
    href: string;
    class?: string;
    onclick?: () => void;
    isSectionEnd?: boolean;
    renderer: Snippet<[Omit<MenuItem, 'renderer'>]>;
  }

  const menuItems: MenuItem[] = $derived([
    { label: 'New', icon: AddIcon, href: urls.current.new, renderer: menuItem },
    {
      label: 'Duplicate',
      icon: DuplicateIcon,
      href: window.location.href,
      isSectionEnd: true,
      renderer: menuItem
    },
    {
      label: 'Mermaid.js',
      icon: MermaidTailIcon,
      href: env.docsUrl,
      renderer: menuItem
    },
    {
      label: 'Documentation',
      icon: BookIcon,
      href: `${env.docsUrl}/intro/`,
      renderer: menuItem
    }
  ]);
</script>

{#snippet actionItem(item: ActionItem)}
  <button
    type="button"
    onclick={item.onclick}
    class={cn(
      'flex items-center justify-start gap-2 border-b-2 p-2 px-3 text-left hover:bg-muted',
      item.isSectionEnd && 'border-border-dark'
    )}>
    <item.icon class="size-5" />
    {item.label}
  </button>
{/snippet}

{#snippet menuItem(options: Omit<MenuItem, 'renderer'>)}
  <a
    href={options.href}
    target="_blank"
    onclick={options.onclick}
    class={cn(
      'flex items-center justify-start gap-2 border-b-2 p-2 px-3 hover:bg-muted',
      options.isSectionEnd && 'border-border-dark',
      options.class
    )}>
    <options.icon class="size-5" />
    {options.label}
  </a>
{/snippet}

<Popover.Root>
  <Popover.Trigger class="shrink-0">
    <MenuIcon class="size-6" />
  </Popover.Trigger>
  <Popover.Content align="start" class="flex flex-col overflow-hidden border-2 p-0" sideOffset={16}>
    {#each fileItems as item (item.label)}
      {@render actionItem(item)}
    {/each}
    {#each menuItems as { renderer, ...item } (item.label)}
      {@render renderer(item)}
    {/each}
  </Popover.Content>
</Popover.Root>
