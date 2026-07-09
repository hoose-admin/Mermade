<script lang="ts">
  import AiHistory from '$/components/AiHistory/AiHistory.svelte';
  import { Button } from '$/components/ui/button';
  import {
    aiHistory,
    AI_CONTEXT_WINDOW,
    contextTurns,
    recordCheckpoint
  } from '$/ai/aiHistory.svelte';
  import { aiKeyDialog, aiPanel, aiSettings } from '$/util/aiSettings.svelte';
  import { generateMermaid, MODEL } from '$/util/gemini';
  import { parse } from '$/util/mermaid';
  import { persisted } from '$/util/persist.svelte';
  import { updateCode, validatedState } from '$/util/state.svelte';
  import AutoAwesomeIcon from '~icons/material-symbols/auto-awesome-outline-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import ForumIcon from '~icons/material-symbols/forum-outline-rounded';
  import HistoryIcon from '~icons/material-symbols/history-rounded';
  import KeyIcon from '~icons/material-symbols/key-outline-rounded';
  import SendIcon from '~icons/material-symbols/arrow-upward-rounded';

  // Persisted so a reload (dev-server HMR or a plain refresh) doesn't discard a
  // half-typed prompt. Cleared on a successful send.
  const draft = persisted<string>('aiDraft', '');
  let loading = $state(false);
  let status = $state('Generating…');
  let error = $state('');
  let summary = $state('');
  let showHistory = $state(false);
  let textarea = $state<HTMLTextAreaElement>();

  // Extra round-trips allowed to fix a diagram that fails to render.
  const MAX_REPAIRS = 2;

  // Focus the input whenever the panel opens.
  $effect(() => {
    if (aiPanel.open) {
      textarea?.focus();
    }
  });

  // Returns the parse error message if `code` is invalid Mermaid, else null.
  const parseError = async (code: string): Promise<string | null> => {
    try {
      await parse(code);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  const submit = async () => {
    if (loading) {
      return;
    }
    if (!aiSettings.hasKey) {
      aiKeyDialog.open = true;
      return;
    }
    const prompt = draft.value.trim();
    if (!prompt) {
      return;
    }
    loading = true;
    status = 'Generating…';
    error = '';
    // The code we send is exactly the "before" state for the checkpoint.
    const beforeCode = validatedState.current.code;
    const diagramType = validatedState.current.diagramType;
    const context = validatedState.current.aiContext;
    // Recent edits leading to the current state (before this one is recorded).
    const history = aiSettings.conversational ? contextTurns() : undefined;
    try {
      const result = await generateMermaid({
        prompt,
        code: beforeCode,
        apiKey: aiSettings.key,
        diagramType,
        context,
        history
      });

      // Validate the model's output and, if it won't render, hand the parse
      // error back to the model to fix — up to MAX_REPAIRS times.
      let code = result.code;
      let err = await parseError(code);
      let repairs = 0;
      while (err && repairs < MAX_REPAIRS) {
        repairs += 1;
        status = `Fixing a syntax error… (attempt ${repairs})`;
        const fix = await generateMermaid({
          prompt: `The Mermaid source above fails to render with this error:\n\n${err}\n\nReturn the corrected, complete Mermaid source. Change only what is needed to make it valid and keep the intended structure. Remember to wrap any label containing parentheses, commas or other special characters in double quotes.`,
          code, // the broken code becomes the "current diagram" to fix
          apiKey: aiSettings.key,
          diagramType,
          context
        });
        code = fix.code;
        err = await parseError(code);
      }

      if (err) {
        // Still broken after retries — leave the current diagram untouched
        // rather than replacing it with something that won't render.
        error = `Couldn't produce a valid diagram after ${repairs} repair ${
          repairs === 1 ? 'attempt' : 'attempts'
        }. Last error: ${err}`;
        return;
      }

      const note = repairs > 0 ? ' (auto-fixed a syntax error)' : '';
      const finalSummary = `${result.summary || 'Diagram updated.'}${note}`;
      updateCode(code, { updateDiagram: true });
      recordCheckpoint({
        prompt,
        summary: finalSummary,
        model: MODEL,
        beforeCode,
        afterCode: code,
        diagramType
      });
      summary = finalSummary;
      draft.value = '';
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Request failed';
    } finally {
      loading = false;
    }
  };
</script>

{#if aiPanel.open}
  <div class="flex flex-none flex-col gap-2 rounded-2xl border-2 border-muted bg-card p-2">
    <div class="flex items-center justify-between">
      <span class="flex items-center gap-1.5 text-sm font-semibold">
        <AutoAwesomeIcon class="size-4 text-accent" /> AI assistant
      </span>
      <div class="flex items-center gap-1">
        <button
          class={[
            'rounded p-1 hover:bg-muted hover:text-foreground',
            aiSettings.conversational ? 'text-accent' : 'text-muted-foreground'
          ]}
          title={aiSettings.conversational
            ? `Conversational mode on — uses your last ${AI_CONTEXT_WINDOW} edits as context`
            : 'Conversational mode off — each prompt is independent'}
          aria-label="Toggle conversational mode"
          aria-pressed={aiSettings.conversational}
          onclick={() => (aiSettings.conversational = !aiSettings.conversational)}>
          <ForumIcon class="size-4" />
        </button>
        <button
          class={[
            'relative rounded p-1 hover:bg-muted hover:text-foreground',
            showHistory ? 'text-accent' : 'text-muted-foreground'
          ]}
          title="Edit history"
          aria-label="AI edit history"
          onclick={() => (showHistory = !showHistory)}>
          <HistoryIcon class="size-4" />
          {#if aiHistory.hasHistory}
            <span
              class="absolute -top-0.5 -right-0.5 flex min-w-3.5 justify-center rounded-full bg-accent px-0.5 text-[9px] leading-3.5 text-accent-foreground">
              {aiHistory.checkpoints.length}
            </span>
          {/if}
        </button>
        <button
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="API key & preferences"
          aria-label="API key and preferences"
          onclick={() => (aiKeyDialog.open = true)}>
          <KeyIcon class="size-4" />
        </button>
        <button
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Close"
          aria-label="Close AI assistant"
          onclick={() => (aiPanel.open = false)}>
          <CloseIcon class="size-4" />
        </button>
      </div>
    </div>

    <div class="flex items-end gap-2">
      <textarea
        bind:this={textarea}
        bind:value={draft.value}
        rows="2"
        disabled={loading}
        placeholder={aiSettings.hasKey
          ? 'Describe what to add or change…'
          : 'Add a Gemini API key to use AI'}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        class="min-h-0 flex-1 resize-none rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-50"
      ></textarea>
      <Button
        variant="accent"
        size="icon"
        title="Send"
        disabled={loading || (aiSettings.hasKey && !draft.value.trim())}
        onclick={submit}>
        <SendIcon />
      </Button>
    </div>

    {#if loading}
      <span class="px-1 text-xs text-muted-foreground">{status}</span>
    {:else if error}
      <span class="px-1 text-xs text-destructive">{error}</span>
    {:else if summary}
      <span class="px-1 text-xs text-muted-foreground">
        <span class="font-medium text-foreground">AI:</span>
        {summary}
      </span>
    {/if}

    {#if showHistory}
      <AiHistory />
    {/if}
  </div>
{/if}
