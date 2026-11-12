<script setup lang="ts">
import { computed } from 'vue'
import { resetMockData } from './storage'
import { sentMessages } from './graph'

const lastMessage = computed(() => sentMessages.value[0])

function reset() {
  resetMockData()
  window.location.reload()
}
</script>

<template>
  <div class="banner" role="status">
    <strong>Mock mode</strong>
    <span>No Microsoft 365 or Azure involved. Data is stored in this browser only.</span>
    <span v-if="lastMessage" class="message">
      Last Teams message → {{ lastMessage.teamName }} › {{ lastMessage.channelName }}: “{{
        lastMessage.originalName
      }}” by {{ lastMessage.uploaderName }}
    </span>
    <fluent-button size="small" appearance="subtle" @click="reset">Reset sample data</fluent-button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  padding: 6px 16px;
  background: var(--colorPaletteYellowBackground2, #fff4ce);
  color: var(--colorNeutralForeground1);
  border-bottom: 1px solid var(--colorPaletteYellowBorder2, #f2d96b);
  font-size: var(--fontSizeBase200);
}

.message {
  font-style: italic;
}
</style>
