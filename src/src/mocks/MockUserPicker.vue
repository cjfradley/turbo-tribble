<script setup lang="ts">
import { mockUsers, signInAs } from './auth'

defineProps<{ returnTo?: string }>()
</script>

<template>
  <div class="picker">
    <p>Mock mode: choose a sample user to sign in as.</p>
    <fluent-button
      v-for="user in mockUsers"
      :key="user.id"
      :appearance="user.admin ? 'secondary' : 'primary'"
      @click="signInAs(user.id, returnTo)"
    >
      {{ user.name }} ({{ user.admin ? 'admin' : 'user' }})
    </fluent-button>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
