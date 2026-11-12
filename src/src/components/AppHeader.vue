<script setup lang="ts">
import { useAuth } from '@/auth/useAuth'

const { isSignedIn, displayName, isAdmin, signOut } = useAuth()
</script>

<template>
  <header class="header">
    <span class="title">Document Library</span>
    <div v-if="isSignedIn" class="user">
      <fluent-badge v-if="isAdmin" appearance="tint">Admin</fluent-badge>
      <fluent-avatar :name="displayName" size="28" />
      <span>{{ displayName }}</span>
      <fluent-button appearance="subtle" @click="signOut()">Sign out</fluent-button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 16px;
  background: var(--colorNeutralBackground1);
  border-bottom: 1px solid var(--colorNeutralStroke2);
}

.title {
  font-size: var(--fontSizeBase500);
  font-weight: var(--fontWeightSemibold);
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
