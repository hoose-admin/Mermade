<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import { Switch } from '$/components/ui/switch';
  import { aiKeyDialog, aiSettings } from '$/util/aiSettings.svelte';

  let value = $state(aiSettings.key);
  let remember = $state(aiSettings.remember);

  // Reset the fields to the stored settings each time the dialog opens.
  $effect(() => {
    if (aiKeyDialog.open) {
      value = aiSettings.key;
      remember = aiSettings.remember;
    }
  });

  const save = () => {
    // Set `remember` first so the key setter routes to the right store.
    aiSettings.remember = remember;
    aiSettings.key = value;
    aiKeyDialog.open = false;
  };
  const clear = () => {
    value = '';
    aiSettings.key = '';
  };
</script>

<Dialog.Root open={aiKeyDialog.open} onOpenChange={(open) => (aiKeyDialog.open = open)}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title class="text-xl">Connect a Gemini API key</Dialog.Title>
      <Dialog.Description>
        Enables AI diagram edits via Google Gemini. Your key is sent directly to Google — nowhere
        else — and stored only where you choose below.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-3">
      <Input
        type="password"
        autocomplete="off"
        placeholder="AIza…"
        bind:value
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            save();
          }
        }} />
      <a
        class="text-sm text-accent underline underline-offset-2"
        href="https://aistudio.google.com/app/api-keys"
        target="_blank"
        rel="noopener noreferrer">
        Get a free key at Google AI Studio →
      </a>
      <p class="text-xs text-muted-foreground">
        Tip: use the <span class="font-medium text-foreground">AI Context</span> tab (next to Code
        and Config) to tell the AI what this diagram is about and how you want it edited.
      </p>

      <div class="flex items-start justify-between gap-3">
        <label for="ai-remember" class="flex flex-col">
          <span class="text-sm font-medium">Remember on this device</span>
          <span class="text-xs text-muted-foreground">
            {remember
              ? 'Saved in this browser (localStorage) so you don’t re-enter it.'
              : 'Kept in memory only — cleared when you close this tab. Best on shared machines.'}
          </span>
        </label>
        <Switch id="ai-remember" bind:checked={remember} />
      </div>

      <div class="flex items-center justify-between">
        <Button variant="ghost" size="sm" onclick={clear}>Clear</Button>
        <Button variant="accent" size="sm" onclick={save}>Save</Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
