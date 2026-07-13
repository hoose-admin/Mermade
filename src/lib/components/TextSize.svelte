<script lang="ts">
  import { buttonVariants } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import { updateConfig, validatedState } from '$/util/state.svelte';
  import { formatJSON } from '$/util/util';
  import { cn } from '$/utils';
  import ChevronDownIcon from '~icons/material-symbols/keyboard-arrow-down-rounded';
  import FormatSizeIcon from '~icons/material-symbols/format-size-rounded';

  // Text sizing has two levels here, and they use different mechanisms on purpose:
  //
  //  • Overall  -> `themeVariables.fontSize`. Mermaid uses this when it MEASURES and
  //    lays out nodes, so boxes grow/shrink to fit. This is the only size knob that
  //    reflows layout.
  //  • Per-category (nodes / edge labels / headers) -> injected `themeCSS`. This only
  //    restyles the already-rendered text, so a much larger size can overflow its box
  //    (layout was computed at the overall size). That's expected for a fine override.
  //
  // Everything MERGES into the current Config so colors/layout/look survive.

  type CssKey = 'node' | 'edge' | 'header';
  type SizeKey = 'overall' | CssKey;

  const ROWS: { key: SizeKey; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'node', label: 'Nodes' },
    { key: 'edge', label: 'Edge labels' },
    { key: 'header', label: 'Headers' }
  ];

  // Target the label wrapper AND its descendants so a nested <p>/<span> can't win.
  const CSS_SELECTOR: Record<CssKey, string> = {
    node: '.nodeLabel, .nodeLabel *',
    edge: '.edgeLabel, .edgeLabel *',
    header: '.cluster-label, .cluster-label *'
  };

  const SIZES = [12, 16, 20, 24, 32];

  // Our per-category rules live inside a marked block in `themeCSS` so we can rewrite
  // just our part without disturbing any CSS the user (or a preset) added. Each rule
  // carries a machine-readable marker so we can read the current size back out.
  const BLOCK_START = '/* text-size:start */';
  const BLOCK_END = '/* text-size:end */';
  const BLOCK_RE = /\/\* text-size:start \*\/[\s\S]*?\/\* text-size:end \*\//;
  const MARKER_RE = /\/\* text-size:(node|edge|header):(\d+) \*\//g;

  const parseFontSize = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const n = parseInt(value, 10);
      return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
  };

  const readCssSizes = (css: string): Partial<Record<CssKey, number>> => {
    const sizes: Partial<Record<CssKey, number>> = {};
    for (const match of css.matchAll(MARKER_RE)) {
      sizes[match[1] as CssKey] = parseInt(match[2], 10);
    }
    return sizes;
  };

  const parseConfig = (): Record<string, unknown> => {
    try {
      return JSON.parse(validatedState.current.mermaid) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  // Which size (if any) is currently active for each row, so the UI can highlight it.
  const current = $derived.by((): Partial<Record<SizeKey, number>> => {
    const config = parseConfig();
    const vars = (config.themeVariables as Record<string, unknown> | undefined) ?? {};
    const css = typeof config.themeCSS === 'string' ? config.themeCSS : '';
    return { overall: parseFontSize(vars.fontSize), ...readCssSizes(css) };
  });

  // Rebuild our marked block from the desired per-category sizes and splice it back
  // into the surrounding CSS. Returns '' when nothing is set so we can drop the key.
  const writeBlock = (existingCss: string, sizes: Partial<Record<CssKey, number>>): string => {
    const rest = existingCss.replace(BLOCK_RE, '').trim();
    const rules = (Object.keys(CSS_SELECTOR) as CssKey[])
      .filter((key) => sizes[key] != null)
      .map(
        (key) =>
          `/* text-size:${key}:${sizes[key]} */ ${CSS_SELECTOR[key]} { font-size: ${sizes[key]}px !important; }`
      );
    if (rules.length === 0) {
      return rest;
    }
    const block = [BLOCK_START, ...rules, BLOCK_END].join('\n');
    return rest ? `${rest}\n${block}` : block;
  };

  // px === null clears that row.
  const applySize = (key: SizeKey, px: number | null): void => {
    const config = parseConfig();

    if (key === 'overall') {
      const vars = { ...((config.themeVariables as Record<string, unknown> | undefined) ?? {}) };
      if (px === null) {
        delete vars.fontSize;
      } else {
        vars.fontSize = `${px}px`;
      }
      if (Object.keys(vars).length === 0) {
        delete config.themeVariables;
      } else {
        config.themeVariables = vars;
      }
    } else {
      const css = typeof config.themeCSS === 'string' ? config.themeCSS : '';
      const sizes = readCssSizes(css);
      if (px === null) {
        delete sizes[key];
      } else {
        sizes[key] = px;
      }
      const next = writeBlock(css, sizes);
      if (next) {
        config.themeCSS = next;
      } else {
        delete config.themeCSS;
      }
    }

    updateConfig(formatJSON(config));
  };
</script>

<Popover.Root>
  <Popover.Trigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 gap-1.5 normal-case')}>
    <FormatSizeIcon class="size-4" />
    Text size
    <ChevronDownIcon class="size-4 opacity-60" />
  </Popover.Trigger>
  <Popover.Content align="start" class="max-h-[70vh] w-64 overflow-y-auto p-2">
    {#each ROWS as row (row.key)}
      <div class="mb-2 last:mb-0">
        <div class="px-1 pb-1 text-xs font-medium text-muted-foreground">{row.label}</div>
        <div class="flex flex-wrap items-center gap-1">
          {#each SIZES as size (size)}
            <button
              class={cn(
                buttonVariants({
                  variant: current[row.key] === size ? 'default' : 'outline',
                  size: 'sm'
                }),
                'h-7 min-w-9 px-2 normal-case'
              )}
              onclick={() => applySize(row.key, size)}>
              {size}
            </button>
          {/each}
          <button
            class={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-7 px-2 text-muted-foreground normal-case'
            )}
            title="Reset {row.label.toLowerCase()}"
            onclick={() => applySize(row.key, null)}>
            Reset
          </button>
        </div>
      </div>
    {/each}
    <p class="text-muted-foreground mt-1 px-1 text-[11px] leading-snug">
      Overall resizes boxes to fit. Per-category only restyles text, so very large sizes may
      overflow. For a single element, ask the AI or use <code>classDef</code>.
    </p>
  </Popover.Content>
</Popover.Root>
