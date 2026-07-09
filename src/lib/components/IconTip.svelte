<script lang="ts">
  import Tip from '$/components/Tip.svelte';
  import { Button } from '$/components/ui/button';
  import type { Component } from 'svelte';

  // Icon button with a fast (0.25s) app tooltip instead of the slow, browser-
  // controlled native `title` tooltip.
  let {
    label,
    icon: Icon,
    onclick,
    href,
    target
  }: {
    label: string;
    icon: Component;
    onclick?: () => void;
    href?: string;
    target?: string;
  } = $props();
</script>

<Tip {label}>
  {#snippet trigger(props)}
    <Button {...props} variant="ghost" size="icon" aria-label={label} {href} {target} {onclick}>
      <Icon />
    </Button>
  {/snippet}
</Tip>
