<script lang="ts">
  import { buttonVariants } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import { updateConfig, validatedState } from '$/util/state.svelte';
  import { formatJSON } from '$/util/util';
  import { cn } from '$/utils';
  import ChevronDownIcon from '~icons/material-symbols/keyboard-arrow-down-rounded';
  import PaletteIcon from '~icons/material-symbols/palette-outline';

  // A compact palette; expanded into a full mermaid `themeVariables` set below so
  // every scheme touches the same keys and switching between them fully overrides.
  interface Palette {
    bg: string; // diagram background reference
    surface: string; // primary node fill
    surface2: string; // secondary node fill
    surface3: string; // tertiary node / cluster fill
    text: string; // text on node fills / general labels
    subtext: string; // muted text (titles, low priority)
    border: string; // node borders / accent
    line: string; // edges / connectors
  }

  interface ColorTheme {
    title: string;
    palette: Palette;
  }

  // These affect ONLY the diagram's own colors (nodes, edges, text) via mermaid's
  // `base` theme + `themeVariables` — not the app chrome.
  const themes: ColorTheme[] = [
    {
      title: 'Solarized Dark',
      palette: {
        bg: '#002b36',
        surface: '#073642',
        surface2: '#586e75',
        surface3: '#0a4f5e',
        text: '#93a1a1',
        subtext: '#839496',
        border: '#268bd2',
        line: '#839496'
      }
    },
    {
      title: 'Gruvbox',
      palette: {
        bg: '#282828',
        surface: '#3c3836',
        surface2: '#504945',
        surface3: '#665c54',
        text: '#ebdbb2',
        subtext: '#a89984',
        border: '#fabd2f',
        line: '#a89984'
      }
    },
    {
      title: 'Nord',
      palette: {
        bg: '#2e3440',
        surface: '#3b4252',
        surface2: '#434c5e',
        surface3: '#4c566a',
        text: '#eceff4',
        subtext: '#d8dee9',
        border: '#88c0d0',
        line: '#81a1c1'
      }
    },
    {
      title: 'Catppuccin Mocha',
      palette: {
        bg: '#1e1e2e',
        surface: '#313244',
        surface2: '#45475a',
        surface3: '#585b70',
        text: '#cdd6f4',
        subtext: '#a6adc8',
        border: '#89b4fa',
        line: '#a6adc8'
      }
    },
    {
      title: 'GitHub Dark',
      palette: {
        bg: '#0d1117',
        surface: '#161b22',
        surface2: '#21262d',
        surface3: '#30363d',
        text: '#e6edf3',
        subtext: '#8b949e',
        border: '#58a6ff',
        line: '#8b949e'
      }
    },
    {
      // Custom palette: salmon / grey / teal / blue.
      title: 'Salmon',
      palette: {
        bg: '#ffffff',
        surface: '#cc8b89', // salmon
        surface2: '#b7d6fb', // blue
        surface3: '#5dcacb', // teal
        text: '#1f2933',
        subtext: '#949494', // grey
        border: '#5dcacb', // teal highlight
        line: '#949494' // grey
      }
    }
  ];

  // Mermaid re-applies these overrides after deriving the rest of the base theme,
  // so the keys we set win and everything else is derived from them.
  const themeVariablesFor = ({
    bg,
    surface,
    surface2,
    surface3,
    text,
    subtext,
    border,
    line
  }: Palette): Record<string, string> => ({
    background: bg,
    primaryColor: surface,
    primaryTextColor: text,
    primaryBorderColor: border,
    secondaryColor: surface2,
    secondaryTextColor: text,
    secondaryBorderColor: border,
    tertiaryColor: surface3,
    tertiaryTextColor: text,
    tertiaryBorderColor: border,
    mainBkg: surface,
    nodeBorder: border,
    lineColor: line,
    textColor: text,
    titleColor: subtext,
    edgeLabelBackground: bg,
    clusterBkg: surface3,
    clusterBorder: border,
    noteBkgColor: surface2,
    noteTextColor: text,
    noteBorderColor: border,
    actorBkg: surface,
    actorBorder: border,
    actorTextColor: text
  });

  // Merge the scheme's colors into the existing Config so layout/look/font
  // settings survive; only `theme` and `themeVariables` colors change.
  const applyTheme = (theme: ColorTheme): void => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(validatedState.current.mermaid) as Record<string, unknown>;
    } catch {
      config = {};
    }
    const existingVars = (config.themeVariables as Record<string, string> | undefined) ?? {};
    config.theme = 'base';
    config.themeVariables = { ...existingVars, ...themeVariablesFor(theme.palette) };
    updateConfig(formatJSON(config));
  };
</script>

<Popover.Root>
  <Popover.Trigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 gap-1.5 normal-case')}>
    <PaletteIcon class="size-4" />
    Colors
    <ChevronDownIcon class="size-4 opacity-60" />
  </Popover.Trigger>
  <Popover.Content align="start" class="w-64 p-1.5">
    <div class="flex flex-wrap gap-1.5">
      {#each themes as theme (theme.title)}
        <Popover.Close
          class={cn(buttonVariants({ size: 'sm' }), 'min-w-20 flex-grow gap-1.5 normal-case')}
          onclick={() => applyTheme(theme)}>
          <span
            class="size-3 shrink-0 rounded-full border border-black/20"
            style="background-color: {theme.palette.surface}"></span>
          {theme.title}
        </Popover.Close>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
