<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import ConflictDialog from '@/components/ConflictDialog.vue'
import TagInput from '@/components/TagInput.vue'
import { config } from '@/config'
import { useDocumentsStore } from '@/stores/documents'
import { useUploadsStore, type UploadItem, type UploadStatus } from '@/stores/uploads'
import { formatSize } from '@/utils/format'

/**
 * Upload (FR-3): pick or drop files, add tags per file, watch progress, resolve name conflicts.
 * The file button is the main control; the drop zone is an extra for mouse users.
 */
const uploads = useUploadsStore()
const { items, pending, conflicts, hasFinished, announcement } = storeToRefs(uploads)
const { allTags } = storeToRefs(useDocumentsStore())

const fileInput = ref<HTMLInputElement>()
const dragging = ref(false)

function onFilesChosen(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files) uploads.add(input.files)
  input.value = '' // so choosing the same file again fires another change
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  if (event.dataTransfer?.files.length) uploads.add(event.dataTransfer.files)
}

const statusText: Record<UploadStatus, string> = {
  pending: 'Ready to upload',
  conflict: 'Name already taken',
  uploading: 'Uploading…',
  done: 'Uploaded',
  error: 'Failed',
  cancelled: 'Cancelled',
}

const percent = (item: UploadItem) =>
  item.file.size ? Math.round((item.loadedBytes / item.file.size) * 100) : 0

const conflict = computed(() => conflicts.value[0] ?? null)
const conflictSuggestion = computed(() =>
  conflict.value ? uploads.suggestName(conflict.value) : '',
)
const conflictCanOverwrite = computed(() =>
  conflict.value ? uploads.canOverwrite(conflict.value) : false,
)
</script>

<template>
  <section class="upload" aria-labelledby="upload-heading">
    <h2 id="upload-heading">Upload</h2>

    <div
      class="dropzone"
      :class="{ dragging }"
      data-testid="dropzone"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <p>Drag files here, or</p>
      <fluent-button appearance="primary" @click="fileInput?.click()">Choose files</fluent-button>
      <input
        ref="fileInput"
        type="file"
        multiple
        hidden
        data-testid="file-input"
        :accept="config.upload.accept || undefined"
        @change="onFilesChosen"
      />
    </div>

    <ul v-if="items.length" class="queue" aria-label="Files to upload">
      <li v-for="item in items" :key="item.id" class="row" :data-status="item.status">
        <div class="file">
          <span class="name">{{ item.file.name }}</span>
          <span class="size">{{ formatSize(item.file.size) }}</span>
          <span class="status" :class="item.status">
            {{ item.error ?? statusText[item.status] }}
          </span>
        </div>

        <fluent-progress-bar
          v-if="item.status === 'uploading' || item.status === 'done'"
          :value="percent(item)"
          max="100"
          :aria-label="`Upload progress for ${item.file.name}`"
          :aria-valuenow="percent(item)"
        />

        <TagInput
          v-if="['pending', 'uploading', 'conflict'].includes(item.status)"
          v-model="item.tags"
          :label="`Tags for ${item.file.name}`"
          :suggestions="allTags"
        />
        <div v-else-if="item.status === 'done' && item.tags.length" class="done-tags">
          <fluent-badge v-for="tag in item.tags" :key="tag" appearance="tint">{{
            tag
          }}</fluent-badge>
        </div>

        <div class="actions">
          <fluent-button
            v-if="item.status === 'pending'"
            size="small"
            @click="uploads.start(item.id)"
          >
            Upload
          </fluent-button>
          <fluent-button
            v-if="['pending', 'uploading', 'conflict'].includes(item.status)"
            size="small"
            appearance="subtle"
            @click="uploads.cancel(item.id)"
          >
            Cancel
          </fluent-button>
          <fluent-button
            v-if="['done', 'error', 'cancelled'].includes(item.status)"
            size="small"
            appearance="subtle"
            :aria-label="`Remove ${item.file.name} from the list`"
            @click="uploads.remove(item.id)"
          >
            Remove
          </fluent-button>
        </div>
      </li>
    </ul>

    <div v-if="items.length" class="queue-actions">
      <fluent-button
        appearance="primary"
        :disabled="pending.length === 0 || undefined"
        @click="uploads.uploadAll()"
      >
        Upload all ({{ pending.length }})
      </fluent-button>
      <fluent-button v-if="hasFinished" appearance="subtle" @click="uploads.clearFinished()">
        Clear finished
      </fluent-button>
    </div>

    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>

    <ConflictDialog
      :item="conflict"
      :can-overwrite="conflictCanOverwrite"
      :suggested-name="conflictSuggestion"
      @overwrite="conflict && uploads.overwrite(conflict.id)"
      @rename="(name) => conflict && uploads.rename(conflict.id, name)"
      @cancel="conflict && uploads.cancel(conflict.id)"
    />
  </section>
</template>

<style scoped>
.upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  margin: 0;
  font-size: var(--fontSizeBase500);
}

.dropzone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  border: 2px dashed var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  background: var(--colorNeutralBackground1);
}

.dropzone.dragging {
  border-color: var(--colorBrandStroke1);
  background: var(--colorBrandBackground2);
}

.dropzone p {
  margin: 0;
}

.queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--colorNeutralBackground1);
  border: 1px solid var(--colorNeutralStroke2);
  border-radius: var(--borderRadiusMedium);
}

.file {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
}

.name {
  font-weight: var(--fontWeightSemibold);
  overflow-wrap: anywhere;
}

.size {
  color: var(--colorNeutralForeground3);
}

.status {
  margin-left: auto;
}

.status.done {
  color: var(--colorPaletteGreenForeground1);
}

.status.error,
.status.conflict {
  color: var(--colorPaletteRedForeground1);
}

.done-tags,
.actions,
.queue-actions {
  display: flex;
  gap: 8px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
