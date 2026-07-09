<script lang="ts">
  import IconTip from '$/components/IconTip.svelte';
  import { Separator } from '$/components/ui/separator';
  import { env } from '$/util/env';
  import { openFile, saveActive, saveActiveAs } from '$/util/fileAccess.svelte';
  import { duplicateActiveTab, newTab } from '$/util/tabsState.svelte';
  import { cmdKey } from '$/util/util';
  import MermaidTailIcon from '~icons/custom/mermaid-tail';
  import AddIcon from '~icons/material-symbols/add-2-rounded';
  import BookIcon from '~icons/material-symbols/book-2-outline-rounded';
  import SyntaxIcon from '~icons/material-symbols/menu-book-outline-rounded';
  import DuplicateIcon from '~icons/material-symbols/content-copy-outline-rounded';
  import FolderOpenIcon from '~icons/material-symbols/folder-open-outline-rounded';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';
  import SaveAsIcon from '~icons/material-symbols/save-as-outline-rounded';
</script>

<div class="flex shrink-0 items-center gap-0.5">
  <IconTip label="New diagram" icon={AddIcon} onclick={() => newTab()} />
  <IconTip label="Duplicate diagram" icon={DuplicateIcon} onclick={() => duplicateActiveTab()} />
  <IconTip label="Open file…" icon={FolderOpenIcon} onclick={() => void openFile()} />
  <IconTip label="Save to file ({cmdKey}+S)" icon={SaveIcon} onclick={() => void saveActive()} />
  <IconTip label="Save as…" icon={SaveAsIcon} onclick={() => void saveActiveAs()} />
  <Separator orientation="vertical" class="mx-1 h-6" />
  <IconTip label="Documentation" icon={BookIcon} href="{env.docsUrl}/intro/" target="_blank" />
  <IconTip
    label="Diagram syntax reference"
    icon={SyntaxIcon}
    href="https://mermaid.ai/open-source/intro/syntax-reference.html"
    target="_blank" />
  <IconTip label="Mermaid.js" icon={MermaidTailIcon} href={env.docsUrl} target="_blank" />
</div>
