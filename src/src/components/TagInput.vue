<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { MAX_TAG_LENGTH, MAX_TAGS, normaliseTag, validateTag, type TagError } from '@/utils/tags'

/**
 * Edits a list of tags (FR-4): Enter or comma adds the typed tag, existing tags are
 * suggested while typing (FR-4.3), and an 11th tag is refused with a reason (FR-4.6).
 * Used at upload time (FR-3.3) and for editing tags later (FR-4.2).
 */
const props = withDefaults(
  defineProps<{
    label?: string
    suggestions?: readonly string[]
    disabled?: boolean
  }>(),
  { label: 'Tags', suggestions: () => [], disabled: false },
)
const tags = defineModel<string[]>({ required: true })

const id = useId()
const draft = ref('')
const error = ref<TagError | null>(null)

const messages: Record<TagError, string> = {
  empty: '',
  'too-long': `A tag can have at most ${MAX_TAG_LENGTH} characters.`,
  'invalid-characters': 'Tags can only use letters a–z, digits, spaces and + - . / : = _',
  duplicate: 'This tag is already added.',
  'too-many': `A file can have at most ${MAX_TAGS} tags.`,
}
const errorMessage = computed(() => (error.value ? messages[error.value] : ''))
const full = computed(() => tags.value.length >= MAX_TAGS)

const matches = computed(() => {
  const text = normaliseTag(draft.value)
  if (!text) return []
  return props.suggestions
    .filter((tag) => tag.includes(text) && !tags.value.includes(tag))
    .slice(0, 5)
})

function add(raw: string): void {
  const result = validateTag(raw, tags.value)
  error.value = result === 'empty' ? null : result
  if (result) return
  tags.value = [...tags.value, normaliseTag(raw)]
  draft.value = ''
}

function remove(tag: string): void {
  tags.value = tags.value.filter((t) => t !== tag)
  error.value = null
}

function onInput(event: Event): void {
  draft.value = (event.target as HTMLInputElement).value
  error.value = full.value && draft.value ? 'too-many' : null
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    add(draft.value)
  } else if (event.key === 'Backspace' && !draft.value && tags.value.length) {
    remove(tags.value[tags.value.length - 1]!)
  }
}
</script>

<template>
  <div class="tag-input">
    <fluent-field label-position="above">
      <label slot="label" :for="id">{{ label }} ({{ tags.length }}/{{ MAX_TAGS }})</label>
      <fluent-text-input
        :id="id"
        slot="input"
        size="small"
        :value="draft"
        :disabled="disabled || undefined"
        :aria-describedby="`${id}-hint ${id}-error`"
        placeholder="Type a tag and press Enter"
        @input="onInput"
        @keydown="onKeydown"
      />
    </fluent-field>
    <span :id="`${id}-hint`" class="visually-hidden">
      Press Enter or comma to add a tag, Backspace to remove the last one.
    </span>

    <div v-if="matches.length" class="suggestions" role="group" aria-label="Suggested tags">
      <fluent-button
        v-for="tag in matches"
        :key="tag"
        size="small"
        appearance="subtle"
        @click="add(tag)"
      >
        {{ tag }}
      </fluent-button>
    </div>

    <ul v-if="tags.length" class="chips" aria-label="Added tags">
      <li v-for="tag in tags" :key="tag">
        <fluent-badge appearance="tint">{{ tag }}</fluent-badge>
        <fluent-button
          v-if="!disabled"
          size="small"
          appearance="transparent"
          :aria-label="`Remove tag ${tag}`"
          @click="remove(tag)"
        >
          ×
        </fluent-button>
      </li>
    </ul>

    <p :id="`${id}-error`" class="error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.tag-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suggestions,
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chips {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chips li {
  display: inline-flex;
  align-items: center;
}

.error {
  margin: 0;
  min-height: 1em;
  color: var(--colorPaletteRedForeground1);
  font-size: var(--fontSizeBase200);
}

.error:empty {
  min-height: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
