<script lang="ts">
  import IconTip from '$/components/IconTip.svelte';
  import { openFile, saveActive, saveActiveAs } from '$/util/fileAccess.svelte';
  import { duplicateActiveTab, newTab } from '$/util/tabsState.svelte';
  import { cmdKey } from '$/util/util';
  import AddIcon from '~icons/material-symbols/add-2-rounded';
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
</div>
