<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AppHeader from '@/components/AppHeader.vue'

// Only loaded in mock mode; production builds drop this import entirely.
const MockBanner = __MOCK_MODE__
  ? defineAsyncComponent(() => import('@/mocks/MockBanner.vue'))
  : null
</script>

<template>
  <component :is="MockBanner" v-if="MockBanner" />
  <AppHeader />
  <main class="content">
    <RouterView />
  </main>
</template>

<style scoped>
.content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}
</style>
