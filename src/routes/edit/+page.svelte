<script lang="ts">
  import Actions from '$/components/Actions.svelte';
  import AiKeyDialog from '$/components/AiKeyDialog.svelte';
  import AiPanel from '$/components/AiPanel.svelte';
  import Card from '$/components/Card/Card.svelte';
  import ColorThemes from '$/components/ColorThemes.svelte';
  import ConfigPresets from '$/components/ConfigPresets.svelte';
  import Editor from '$/components/Editor.svelte';
  import FileToolbar from '$/components/FileToolbar.svelte';
  import History from '$/components/History/History.svelte';
  import { startAutoSave } from '$/components/History/historyState.svelte';
  import IconTip from '$/components/IconTip.svelte';
  import Navbar from '$/components/Navbar.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import Preset from '$/components/Preset.svelte';
  import Share from '$/components/Share.svelte';
  import Support from '$/components/Support.svelte';
  import TabBar from '$/components/TabBar.svelte';
  import ThemeToggle from '$/components/ThemeToggle.svelte';
  import Tip from '$/components/Tip.svelte';
  import SyncRoughToolbar from '$/components/SyncRoughToolbar.svelte';
  import * as Resizable from '$/components/ui/resizable';
  import { Separator } from '$/components/ui/separator';
  import { Switch } from '$/components/ui/switch';
  import { Toggle } from '$/components/ui/toggle';
  import View from '$/components/View.svelte';
  import type { EditorMode, Tab } from '$/types';
  import { aiPanel } from '$/util/aiSettings.svelte';
  import { saveActive, saveActiveAs } from '$/util/fileAccess.svelte';
  import { PanZoomState } from '$/util/panZoom';
  import { validatedState, updateCodeStore, migrateLegacyAiContext } from '$/util/state.svelte';
  import { logEvent } from '$/util/stats';
  import { initHandler } from '$/util/util';
  import { onMount } from 'svelte';
  import CodeIcon from '~icons/custom/code';
  import AutoAwesomeIcon from '~icons/material-symbols/auto-awesome-outline-rounded';
  import ChevronLeftIcon from '~icons/material-symbols/chevron-left-rounded';
  import ChevronRightIcon from '~icons/material-symbols/chevron-right-rounded';
  import HistoryIcon from '~icons/material-symbols/history';
  import GearIcon from '~icons/material-symbols/settings-outline-rounded';
  import ContextIcon from '~icons/material-symbols/description-outline-rounded';

  const panZoomState = new PanZoomState();

  const tabSelectHandler = (tab: Tab) => {
    updateCodeStore({ editorMode: tab.id as EditorMode });
  };

  const editorTabs: Tab[] = [
    {
      icon: CodeIcon,
      id: 'code',
      title: 'Code'
    },
    {
      icon: GearIcon,
      id: 'config',
      title: 'Config'
    },
    {
      icon: ContextIcon,
      id: 'context',
      title: 'AI Context'
    }
  ];

  let width = $state(0);
  let isMobile = $derived(width < 640);
  let isViewMode = $state(true);

  onMount(async () => {
    await initHandler();
    // Tabs exist now; seed the active diagram from any legacy global instructions.
    migrateLegacyAiContext();
    window.addEventListener('appinstalled', () => {
      logEvent('pwaInstalled', { isMobile });
    });
  });

  // Record the Timeline for the whole session, not just while the panel is open.
  onMount(() => startAutoSave());

  // ⌘/Ctrl+S saves the active tab to disk (Shift for "Save as…").
  onMount(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void (event.shiftKey ? saveActiveAs() : saveActive());
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });

  let isEditorCollapsed = $state(false);
  let isHistoryOpen = $state(false);

  let editorPane: Resizable.Pane | undefined;
  $effect(() => {
    if (isMobile) {
      editorPane?.resize(50);
    }
  });
</script>

<div class="flex h-full flex-col overflow-hidden">
  {#snippet mobileToggle()}
    <div class="flex items-center gap-2">
      Edit <Switch
        id="editorMode"
        class="data-[state=checked]:bg-accent"
        bind:checked={isViewMode}
        onclick={() => {
          logEvent('mobileViewToggle');
        }} /> View
    </div>
  {/snippet}

  <Navbar mobileToggle={isMobile ? mobileToggle : undefined}>
    <FileToolbar />
    <Separator orientation="vertical" class="mx-1 h-6" />
    <Preset />
    <ConfigPresets />
    <ColorThemes />
    <Actions />
    <Support />
    <div class="flex-1"></div>
    <IconTip
      label="AI assistant"
      icon={AutoAwesomeIcon}
      onclick={() => (aiPanel.open = !aiPanel.open)} />
    <Tip label="History">
      {#snippet trigger(props)}
        <Toggle
          {...props}
          bind:pressed={isHistoryOpen}
          size="sm"
          aria-label="History"
          class="shrink-0">
          <HistoryIcon />
        </Toggle>
      {/snippet}
    </Tip>
    <Share />
    <ThemeToggle />
  </Navbar>

  <TabBar />

  <div class="flex flex-1 flex-col overflow-hidden" bind:clientWidth={width}>
    <div
      class={[
        'size-full',
        isMobile && ['w-[200%] duration-300', isViewMode && '-translate-x-1/2']
      ]}>
      <Resizable.PaneGroup
        direction="horizontal"
        autoSaveId="editor-split"
        class="gap-4 p-2 pt-0 pb-1 pl-1 sm:gap-0 sm:p-6 sm:pt-0 sm:pb-3 sm:pl-3">
        <Resizable.Pane
          bind:this={editorPane}
          defaultSize={30}
          minSize={15}
          collapsible={true}
          collapsedSize={3}
          onCollapse={() => (isEditorCollapsed = true)}
          onExpand={() => (isEditorCollapsed = false)}>
          {#if isEditorCollapsed}
            <div class="flex h-full justify-center pt-1">
              <IconTip
                label="Show editor"
                icon={ChevronRightIcon}
                onclick={() => editorPane?.expand()} />
            </div>
          {:else}
            <div class="flex h-full flex-col gap-2">
              <Card
                onselect={tabSelectHandler}
                isOpen
                tabs={editorTabs}
                activeTabID={validatedState.current.editorMode}
                isClosable={false}>
                {#snippet actions()}
                  <IconTip
                    label="Collapse editor"
                    icon={ChevronLeftIcon}
                    onclick={() => editorPane?.collapse()} />
                {/snippet}
                <Editor {isMobile} />
              </Card>
              <AiPanel />
            </div>
          {/if}
        </Resizable.Pane>
        <Resizable.Handle withHandle class="hidden sm:flex" />
        <Resizable.Pane minSize={15} class="relative flex h-full flex-1 flex-col overflow-hidden">
          <View {panZoomState} shouldShowGrid={validatedState.current.grid} />
          <div class="absolute top-0 right-0"><PanZoomToolbar {panZoomState} /></div>
          <div class="absolute bottom-0 left-0 sm:left-5"><SyncRoughToolbar /></div>
        </Resizable.Pane>
        {#if isHistoryOpen}
          <Resizable.Handle withHandle class="hidden sm:flex" />
          <Resizable.Pane minSize={15} defaultSize={30} class="hidden h-full grow flex-col sm:flex">
            <History />
          </Resizable.Pane>
        {/if}
      </Resizable.PaneGroup>
    </div>
  </div>
</div>

<AiKeyDialog />
