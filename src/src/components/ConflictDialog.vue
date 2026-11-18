<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { UploadItem } from '@/stores/uploads'

/**
 * Asks what to do when a file with the same name exists (FR-3.5): overwrite, rename or cancel.
 * "Overwrite" is only offered when `canOverwrite` is set (original uploader or admin).
 */
const props = defineProps<{
  item: UploadItem | null
  canOverwrite: boolean
  suggestedName: string
}>()
const emit = defineEmits<{
  overwrite: []
  rename: [name: string]
  cancel: []
}>()

const dialog = ref<HTMLElement & { show(): void; hide(): void }>()
const newName = ref('')

watch(
  () => props.item?.id,
  async (id) => {
    newName.value = props.suggestedName
    await nextTick()
    if (id) dialog.value?.show()
    else dialog.value?.hide()
  },
  { immediate: true },
)

/** Escape closes the native dialog; treat that as "cancel". */
function onToggle(event: Event): void {
  const state = (event as CustomEvent<{ newState: string }>).detail?.newState
  if (state === 'closed' && props.item) emit('cancel')
}

function onRename(): void {
  if (newName.value.trim()) emit('rename', newName.value)
}
</script>

<template>
  <fluent-dialog ref="dialog" type="modal" aria-label="File already exists" @toggle="onToggle">
    <fluent-dialog-body v-if="item">
      <!-- aria-label above, because the dialog's shadow DOM can't reference this id. -->
      <h2 slot="title">File already exists</h2>

      <p>
        A file named <strong>{{ item.existing?.originalName ?? item.file.name }}</strong> already
        exists<template v-if="item.existing?.uploaderName">
          (uploaded by {{ item.existing.uploaderName }})</template
        >.
      </p>
      <p v-if="!canOverwrite" class="hint">
        Only the person who uploaded it or an admin can replace it. You can upload yours under
        another name.
      </p>
      <p v-else class="hint">
        If you overwrite it, an admin can still restore the earlier version.
      </p>

      <form class="rename" @submit.prevent="onRename">
        <fluent-field label-position="above">
          <label slot="label" for="conflict-name">New name</label>
          <fluent-text-input
            id="conflict-name"
            slot="input"
            :value="newName"
            @input="newName = ($event.target as HTMLInputElement).value"
          />
        </fluent-field>
      </form>

      <fluent-button slot="action" appearance="primary" @click="onRename">Rename</fluent-button>
      <fluent-button v-if="canOverwrite" slot="action" @click="emit('overwrite')">
        Overwrite
      </fluent-button>
      <fluent-button slot="action" appearance="subtle" @click="emit('cancel')"
        >Cancel</fluent-button
      >
    </fluent-dialog-body>
  </fluent-dialog>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: var(--fontSizeBase500);
}

.hint {
  color: var(--colorNeutralForeground3);
}

.rename {
  margin-top: 12px;
}
</style>
