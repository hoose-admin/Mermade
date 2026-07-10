<script lang="ts">
  import * as Dialog from '$/components/ui/dialog';
  import { env } from '$/util/env';
  import ShieldIcon from '~icons/material-symbols/shield-lock-outline-rounded';
</script>

{#if env.privacyPolicyUrl}
  <a href={env.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
    <ShieldIcon />
  </a>
{:else}
  <Dialog.Root>
    <Dialog.Trigger>
      <ShieldIcon />
    </Dialog.Trigger>
    <Dialog.Content class="max-h-full overflow-hidden overflow-y-auto p-12">
      <Dialog.Header>
        <Dialog.Title class="flex items-center gap-2 text-xl">
          <ShieldIcon class="size-8 text-green-700" />
          Data security
        </Dialog.Title>
      </Dialog.Header>

      <p class="text-xl font-semibold">Your diagrams never leave your browser.</p>
      <p>
        They're stored only in the page URL and this browser's local storage. This is a fully
        client-side app: it collects no analytics and sends nothing you type to any server.
      </p>
      <p>
        The only exception is the optional AI assistant. If you connect your own Google Gemini API
        key, your prompt and the current diagram are sent directly from your browser to Google's
        Gemini API to generate edits — nowhere else. Your API key is stored only in this browser and
        is never transmitted to us or any third party.
      </p>
    </Dialog.Content>
  </Dialog.Root>
{/if}
