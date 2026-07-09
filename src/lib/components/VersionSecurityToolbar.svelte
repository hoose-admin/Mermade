<script lang="ts">
  import FloatingToolbar from '$/components/FloatingToolbar.svelte';
  import Privacy from '$/components/Privacy.svelte';
  import { Button } from '$/components/ui/button';
  import { env } from '$/util/env';
</script>

{#if !env.hidePrivacyPolicy}
  <FloatingToolbar>
    <Button variant="ghost" size="icon" title="Privacy & Security">
      <Privacy />
    </Button>
  </FloatingToolbar>
{/if}
