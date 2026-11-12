import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { findByTags, listDocuments, type DocumentItem } from '@/services/storage'
import { normaliseSearchText } from '@/utils/fileName'

/**
 * The loaded document list plus search state (FR-2, FR-5).
 * The list is loaded once and filtered on the client, so typing doesn't re-list the container.
 */
export const useDocumentsStore = defineStore('documents', () => {
  const items = ref<DocumentItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const searchText = ref('')
  const selectedTags = ref<string[]>([])
  const tagMatches = ref<Set<string> | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      items.value = await listDocuments()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function setSelectedTags(tags: string[]): Promise<void> {
    selectedTags.value = tags
    tagMatches.value = tags.length ? await findByTags(tags) : null
  }

  const allTags = computed(() => [...new Set(items.value.flatMap((item) => item.tags))].sort())

  const filtered = computed(() => {
    const text = normaliseSearchText(searchText.value)
    return items.value.filter((item) => {
      if (tagMatches.value && !tagMatches.value.has(item.name)) return false
      if (!text) return true
      return item.name.startsWith(text) || item.tags.some((tag) => tag.startsWith(text))
    })
  })

  return {
    items,
    loading,
    error,
    searchText,
    selectedTags,
    allTags,
    filtered,
    load,
    setSelectedTags,
  }
})
