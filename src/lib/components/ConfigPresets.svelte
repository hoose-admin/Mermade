<script lang="ts">
  import { buttonVariants } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import { updateConfig } from '$/util/state.svelte';
  import { formatJSON } from '$/util/util';
  import { cn } from '$/utils';
  import ChevronDownIcon from '~icons/material-symbols/keyboard-arrow-down-rounded';
  import TuneIcon from '~icons/material-symbols/tune-rounded';

  interface ConfigPreset {
    title: string;
    config: Record<string, unknown>;
  }

  // Each preset replaces the diagram's Config (the JSON in the "Config" tab).
  const configs: ConfigPreset[] = [
    { title: 'Default', config: { theme: 'default' } },
    { title: 'Dark', config: { theme: 'dark' } },
    { title: 'Forest', config: { theme: 'forest' } },
    { title: 'Neutral', config: { theme: 'neutral' } },
    {
      title: 'Weave',
      config: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#dbe4ff',
          primaryBorderColor: '#1e66f5',
          primaryTextColor: '#15130f',
          lineColor: '#5d574d',
          fontFamily: 'Fira Code, monospace'
        }
      }
    },
    { title: 'Hand-drawn', config: { theme: 'default', look: 'handDrawn' } },
    { title: 'ELK layout', config: { theme: 'default', layout: 'elk' } },
    { title: 'Large text', config: { theme: 'default', themeVariables: { fontSize: '20px' } } }
  ];

  const applyConfig = (preset: ConfigPreset): void => {
    updateConfig(formatJSON(preset.config));
  };
</script>

<Popover.Root>
  <Popover.Trigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 gap-1.5 normal-case')}>
    <TuneIcon class="size-4" />
    Configs
    <ChevronDownIcon class="size-4 opacity-60" />
  </Popover.Trigger>
  <Popover.Content align="start" class="w-64 p-1.5">
    <div class="flex flex-wrap gap-1.5">
      {#each configs as preset (preset.title)}
        <Popover.Close
          class={cn(buttonVariants({ size: 'sm' }), 'min-w-20 flex-grow normal-case')}
          onclick={() => applyConfig(preset)}>
          {preset.title}
        </Popover.Close>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
