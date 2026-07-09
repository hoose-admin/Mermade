<script lang="ts">
  import type { EditorProps } from '$/types';
  import { aiPanel } from '$/util/aiSettings.svelte';
  import { env } from '$/util/env';
  import { validatedState } from '$/util/state.svelte';
  import { initEditor } from '$lib/util/monacoExtra';
  import { errorDebug } from '$lib/util/util';
  import { mode } from 'mode-watcher';
  import * as monaco from 'monaco-editor';
  import monacoEditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import monacoJsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import { onMount } from 'svelte';

  const { onUpdate }: EditorProps = $props();

  let divElement: HTMLDivElement | undefined = $state();
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let editorOptions = {
    minimap: {
      enabled: false
    },
    overviewRulerLanes: 0,
    glyphMargin: true,
    lineNumbersMinChars: 4,
    // Small breathing room so the first line doesn't abut the top edge.
    padding: { top: 8 }
  } satisfies monaco.editor.IStandaloneEditorConstructionOptions;
  let currentText = '';
  let isUpdatingFromState = false;
  let decorationsCollection: monaco.editor.IEditorDecorationsCollection | undefined;
  let lastMouseLine = 0;

  const applyEditorTheme = (currentMode: typeof mode.current) => {
    if (!editor) return;
    monaco.editor.setTheme(`mermaid${currentMode === 'dark' ? '-dark' : ''}`);
    divElement?.classList.toggle('mermaid-dark', currentMode === 'dark');
  };

  $effect(() => {
    applyEditorTheme(mode.current);
  });

  const jsonModel = monaco.editor.createModel(
    '',
    'json',
    monaco.Uri.parse('internal://config.json')
  );
  const mermaidModel = monaco.editor.createModel(
    '',
    'mermaid',
    monaco.Uri.parse('internal://mermaid.mmd')
  );
  // Per-diagram "AI Context" tab — freeform prose, edited as Markdown.
  const contextModel = monaco.editor.createModel(
    '',
    'markdown',
    monaco.Uri.parse('internal://ai-context.md')
  );

  // The gutter glyph is the per-line "AI" trigger; clicking it opens the AI panel.
  const renderAIPromptGutterGlyphIcon = () => {
    decorationsCollection?.clear();
    if (!editor) {
      return;
    }
    const model = editor.getModel();
    if (!model) {
      return;
    }

    if (lastMouseLine > 0 && model.id === mermaidModel.id) {
      decorationsCollection?.set([
        {
          range: new monaco.Range(lastMouseLine, 1, lastMouseLine, 1),
          options: {
            glyphMarginClassName: 'suggestion-icon'
          }
        }
      ]);
    }
  };

  onMount(() => {
    self.MonacoEnvironment = {
      getWorker(_, label) {
        if (label === 'json') {
          return new monacoJsonWorker();
        }
        return new monacoEditorWorker();
      }
    };

    if (!divElement) {
      throw new Error('divEl is undefined');
    }

    monaco.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: true,
      schemas: [
        {
          fileMatch: ['config.json'],
          uri: `${env.docsUrl}/schemas/config.schema.json`
        }
      ]
    });

    initEditor(monaco);
    errorDebug();
    editor = monaco.editor.create(divElement, editorOptions);
    decorationsCollection = editor.createDecorationsCollection([]);

    editor.onMouseDown((e) => {
      const isGutter = e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN;
      if (isGutter && e.target.position?.lineNumber === lastMouseLine && lastMouseLine > 0) {
        e.event.preventDefault();
        e.event.stopPropagation();
        aiPanel.open = true;
      }
    });

    editor.onDidChangeModelContent(({ isFlush }) => {
      const newText = editor?.getValue();
      if (!newText || currentText === newText || isFlush || isUpdatingFromState) {
        return;
      }
      currentText = newText;
      onUpdate(currentText);
    });

    editor.onMouseMove((e) => {
      if (!editor) return;
      if (editor.getModel()?.id !== mermaidModel.id) return;

      lastMouseLine = e.target.position?.lineNumber ?? 0;
      renderAIPromptGutterGlyphIcon();
    });

    editor.onMouseLeave(() => {
      lastMouseLine = 0;
      renderAIPromptGutterGlyphIcon();
    });

    applyEditorTheme(mode.current);

    const resizeObserver = new ResizeObserver((entries) => {
      editor?.layout({
        height: entries[0].contentRect.height,
        width: entries[0].contentRect.width
      });
    });

    if (divElement.parentElement) {
      resizeObserver.observe(divElement);
    }

    renderAIPromptGutterGlyphIcon();

    return () => {
      resizeObserver.disconnect();
      jsonModel.dispose();
      mermaidModel.dispose();
      contextModel.dispose();
      editor?.dispose();
    };
  });

  $effect(() => {
    const { errorMarkers, editorMode, code, mermaid, aiContext } = validatedState.current;
    if (!editor) {
      return;
    }

    const model =
      editorMode === 'code' ? mermaidModel : editorMode === 'config' ? jsonModel : contextModel;

    // The AI Context tab is prose, so wrap it; code/config read better unwrapped.
    editor.updateOptions({ wordWrap: editorMode === 'context' ? 'on' : 'off' });

    if (editor.getModel()?.id !== model.id) {
      editor.setModel(model);
      renderAIPromptGutterGlyphIcon();
    }

    // Clear decorations if not in 'code' mode, or if the model changes
    if (editorMode !== 'code' || editor.getModel()?.id !== mermaidModel.id) {
      decorationsCollection?.clear();
    }

    // Update editor text if it's different
    const newText =
      editorMode === 'code' ? code : editorMode === 'config' ? mermaid : (aiContext ?? '');
    if (newText !== currentText) {
      isUpdatingFromState = true;
      try {
        editor.setScrollTop(0);
        editor.pushUndoStop();
        editor.executeEdits('updateCode', [
          {
            range: model.getFullModelRange(),
            text: newText
          }
        ]);
        editor.pushUndoStop();
        currentText = newText;
      } finally {
        isUpdatingFromState = false;
      }
      renderAIPromptGutterGlyphIcon();
    }

    // Display/clear errors
    monaco.editor.setModelMarkers(model, 'mermaid', errorMarkers);
  });
</script>

<div class="relative h-full grow overflow-hidden">
  <div bind:this={divElement} id="editor" class="h-full w-full"></div>
</div>

<style>
  :global(.suggestion-icon) {
    background-color: #e8eaf9;
    width: 20px !important;
    height: 20px !important;
    margin-left: 4px;
    background-image: url('/icons/use-chat.svg');
    background-size: 16px 16px;
    background-repeat: no-repeat;
    background-position: center;
    border-radius: 4px;
    cursor: pointer;
  }

  :global(#editor.mermaid-dark .suggestion-icon) {
    background-color: #2e4d6b;
    background-image: url('/icons/use-chat-dark.svg');
  }
</style>
