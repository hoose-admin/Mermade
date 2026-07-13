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

  interface ConfigGroup {
    label: string;
    presets: ConfigPreset[];
  }

  // Each preset REPLACES the diagram's Config (the JSON in the "Config" tab), so every
  // entry is self-contained (it carries its own `theme`). Everything here is expressible
  // as Mermaid config; shape/edge tricks that need diagram *code* live in the examples instead.
  const groups: ConfigGroup[] = [
    {
      label: 'Look',
      presets: [
        { title: 'Hand-drawn', config: { theme: 'default', look: 'handDrawn', handDrawnSeed: 1 } },
        {
          title: 'Sketch note',
          config: {
            theme: 'default',
            look: 'handDrawn',
            handDrawnSeed: 1,
            themeVariables: { fontFamily: 'Comic Sans MS, Segoe Print, Bradley Hand, cursive' }
          }
        },
        { title: 'Neo', config: { theme: 'neo', look: 'neo' } }
      ]
    },
    {
      label: 'Edges',
      presets: [
        { title: 'Smooth', config: { theme: 'default', flowchart: { curve: 'basis' } } },
        { title: 'Stepped', config: { theme: 'default', flowchart: { curve: 'step' } } },
        { title: 'Straight', config: { theme: 'default', flowchart: { curve: 'linear' } } }
      ]
    },
    {
      label: 'Effects',
      presets: [
        {
          title: 'Shadows',
          config: {
            theme: 'default',
            themeCSS:
              '.node rect, .node circle, .node ellipse, .node polygon, .node path { filter: drop-shadow(2px 3px 3px rgba(0,0,0,0.35)); }'
          }
        },
        {
          title: 'Cards',
          config: {
            theme: 'default',
            themeCSS:
              '.node rect { rx: 14px; ry: 14px; } .node rect, .node polygon { filter: drop-shadow(1px 2px 3px rgba(0,0,0,0.28)); }'
          }
        },
        {
          title: 'Neon',
          config: {
            theme: 'dark',
            themeCSS:
              '.node rect, .node circle, .node ellipse, .node polygon, .node path { stroke: #22d3ee; filter: drop-shadow(0 0 6px #22d3ee); } .edgePaths .path, .flowchart-link { filter: drop-shadow(0 0 4px #22d3ee); }'
          }
        },
        {
          title: 'Dashed',
          config: {
            theme: 'default',
            themeCSS:
              '.node rect, .node circle, .node ellipse, .node polygon { stroke-dasharray: 6 4; }'
          }
        }
      ]
    },
    {
      label: 'Layout',
      presets: [
        { title: 'ELK', config: { theme: 'default', layout: 'elk' } },
        { title: 'Tidy tree', config: { theme: 'default', layout: 'tidy-tree' } }
      ]
    },
    {
      label: 'Text',
      presets: [
        { title: 'Large text', config: { theme: 'default', themeVariables: { fontSize: '20px' } } },
        {
          title: 'Mono',
          config: {
            theme: 'default',
            themeVariables: { fontFamily: 'JetBrains Mono, Fira Code, monospace' }
          }
        }
      ]
    }
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
  <Popover.Content align="start" class="max-h-[70vh] w-72 overflow-y-auto p-2">
    {#each groups as group (group.label)}
      <div class="mb-2 last:mb-0">
        <div class="px-1 pb-1 text-xs font-medium text-muted-foreground">{group.label}</div>
        <div class="flex flex-wrap gap-1.5">
          {#each group.presets as preset (preset.title)}
            <Popover.Close
              class={cn(buttonVariants({ size: 'sm' }), 'min-w-20 flex-grow normal-case')}
              onclick={() => applyConfig(preset)}>
              {preset.title}
            </Popover.Close>
          {/each}
        </div>
      </div>
    {/each}
  </Popover.Content>
</Popover.Root>
