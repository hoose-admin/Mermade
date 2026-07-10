<script lang="ts">
  import Tip from '$/components/Tip.svelte';
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import HeartIcon from '~icons/material-symbols/favorite-outline-rounded';

  let open = $state(false);
</script>

<Tip label="Support the developer">
  {#snippet trigger(props)}
    <Button
      {...props}
      variant="ghost"
      size="sm"
      aria-label="Tip the dev"
      class="shrink-0 gap-1.5 text-rose-500 hover:text-rose-600"
      onclick={() => (open = true)}>
      <HeartIcon />
      Tip the dev
    </Button>
  {/snippet}
</Tip>

<Dialog.Root bind:open>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title class="text-xl">Show the developer some love ❤️</Dialog.Title>
      <Dialog.Description>
        This tool is free, but the money and time spent hosting and developing it was not. If it has
        been useful to you, consider sending a tip — it helps keep the lights on and the features
        coming.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col items-center gap-3">
      <img
        src="/venmo.jpg"
        alt="Venmo QR code — scan with your phone to tip the developer"
        width="900"
        height="619"
        class="w-full max-w-sm rounded-lg border" />
      <p class="text-sm text-muted-foreground">
        Scan the QR code with your phone's camera to open Venmo. Thank you! 🙏
      </p>
    </div>
  </Dialog.Content>
</Dialog.Root>
