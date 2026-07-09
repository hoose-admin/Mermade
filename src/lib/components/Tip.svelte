<script lang="ts">
  import * as Tooltip from '$/components/ui/tooltip';
  import type { Snippet } from 'svelte';

  // Generic fast (0.25s) tooltip. The `trigger` snippet receives props that must
  // be spread onto the trigger element (button, toggle, etc.) so hover/focus
  // wiring reaches it without nesting interactive elements.
  let {
    label,
    side = 'bottom',
    trigger
  }: {
    label: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    trigger: Snippet<[Record<string, unknown>]>;
  } = $props();
</script>

<Tooltip.Provider>
  <Tooltip.Root delayDuration={250}>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        {@render trigger(props)}
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content {side} sideOffset={6}>{label}</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
