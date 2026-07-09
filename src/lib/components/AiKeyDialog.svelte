<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import { aiKeyDialog, aiSettings } from '$/util/aiSettings.svelte';

  let value = $state(aiSettings.key);
  let style = $state(aiSettings.style);

  // Reset the fields to the stored values each time the dialog opens.
  $effect(() => {
    if (aiKeyDialog.open) {
      value = aiSettings.key;
      style = aiSettings.style;
    }
  });

  const save = () => {
    aiSettings.key = value;
    aiSettings.style = style;
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
        Enables AI diagram edits via Google Gemini. Your key is stored only in this browser
        (localStorage) and is sent directly to Google — nowhere else.
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

      <div class="flex flex-col gap-1.5 border-t border-muted pt-3">
        <label for="ai-style" class="text-sm font-medium">Custom instructions</label>
        <p class="text-xs text-muted-foreground">
          Standing preferences the AI follows on every edit — style, conventions, defaults.
          E.g. “Use left-to-right flowcharts and keep node labels short.”
        </p>
        <textarea
          id="ai-style"
          rows="4"
          bind:value={style}
          placeholder="Optional — how should the AI build your diagrams?"
          class="resize-y rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
        ></textarea>
      </div>

      <div class="flex items-center justify-between">
        <Button variant="ghost" size="sm" onclick={clear}>Clear</Button>
        <Button variant="accent" size="sm" onclick={save}>Save</Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
