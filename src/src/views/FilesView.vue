<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDocumentsStore } from '@/stores/documents'
import { downloadDocument, type DocumentItem } from '@/services/storage'
import UploadPanel from '@/components/UploadPanel.vue'
import { formatSize } from '@/utils/format'

/**
 * Files list with search and upload. Tag editing, delete and the Teams picker
 * are separate components still to be built (see docs/requirements.md, section 4).
 */
const store = useDocumentsStore()
const { filtered, loading, error, searchText } = storeToRefs(store)
const route = useRoute()
const router = useRouter()

// Deep link /files?name=<blob name> pre-fills the search (FR-2.6).
const linkedName = computed(() => (typeof route.query.name === 'string' ? route.query.name : ''))
watch(linkedName, (name) => (searchText.value = name), { immediate: true })

const linkedFileMissing = computed(
  () =>
    !!linkedName.value && !loading.value && !store.items.some((i) => i.name === linkedName.value),
)

function clearLink() {
  searchText.value = ''
  void router.replace({ name: 'files' })
}

function onSearchInput(event: Event) {
  searchText.value = (event.target as HTMLInputElement).value
}

function onDownload(item: DocumentItem) {
  void downloadDocument(item)
}

onMounted(() => store.load())
</script>

<template>
  <section class="files">
    <UploadPanel />

    <div class="toolbar">
      <fluent-field label-position="above">
        <label slot="label" for="search">Search by file name or tag</label>
        <fluent-text-input
          id="search"
          slot="input"
          type="search"
          :value="searchText"
          placeholder="e.g. q3-report or invoice"
          @input="onSearchInput"
        />
      </fluent-field>
    </div>

    <fluent-message-bar v-if="error" intent="error">{{ error }}</fluent-message-bar>
    <fluent-message-bar v-if="linkedFileMissing" intent="warning">
      The linked file "{{ linkedName }}" wasn't found. It may have been deleted.
      <fluent-button slot="actions" size="small" @click="clearLink">Clear filter</fluent-button>
    </fluent-message-bar>

    <fluent-spinner v-if="loading" />

    <table v-else class="table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Tags</th>
          <th scope="col">Size</th>
          <th scope="col">Uploaded by</th>
          <th scope="col">Uploaded</th>
          <th scope="col"><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filtered" :key="item.name">
          <td>{{ item.originalName }}</td>
          <td>
            <fluent-badge v-for="tag in item.tags" :key="tag" appearance="tint" class="tag">
              {{ tag }}
            </fluent-badge>
          </td>
          <td>{{ formatSize(item.size) }}</td>
          <td>{{ item.uploaderName ?? '–' }}</td>
          <td>{{ item.uploadedOn?.toLocaleDateString() ?? '–' }}</td>
          <td>
            <fluent-button appearance="subtle" size="small" @click="onDownload(item)">
              Download
            </fluent-button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="6" class="empty">No documents found.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.files {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  max-width: 480px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--colorNeutralBackground1);
  border-radius: var(--borderRadiusMedium);
  overflow: hidden;
}

.table th,
.table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.table th {
  font-weight: var(--fontWeightSemibold);
}

.tag {
  margin-right: 4px;
}

.empty {
  text-align: center;
  color: var(--colorNeutralForeground3);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
