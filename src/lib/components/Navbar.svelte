<script lang="ts" module>
  import { logEvent } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
    hidePromotion?: boolean;
  }

  let { children, mobileToggle }: Props = $props();
</script>

<nav class="z-50 flex items-center gap-2 px-3 py-2">
  <div class="flex w-full min-w-0 items-center gap-1 overflow-x-auto">
    {@render children()}
  </div>
  {#if mobileToggle}
    <div class="shrink-0">{@render mobileToggle()}</div>
  {/if}
</nav>
