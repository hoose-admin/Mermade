<script lang="ts">
  import ThemeIcon from '$/components/ThemeIcon.svelte';
  import Tip from '$/components/Tip.svelte';
  import { Button } from '$/components/ui/button';
  import { TID } from '$/constants';
  import { mode, setMode } from 'mode-watcher';
</script>

<Tip label="Switch to {mode.current === 'dark' ? 'light' : 'dark'} theme">
  {#snippet trigger(props)}
    <Button
      {...props}
      variant="ghost"
      size="icon"
      data-testid={TID.themeToggleButton}
      class="[&_svg]:size-5"
      onclick={() => setMode(mode.current === 'dark' ? 'light' : 'dark')}>
      <ThemeIcon />
    </Button>
  {/snippet}
</Tip>
