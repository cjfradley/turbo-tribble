<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/auth/useAuth'

// Only loaded in mock mode; production builds drop this import entirely.
const MockUserPicker = __MOCK_MODE__
  ? defineAsyncComponent(() => import('@/mocks/MockUserPicker.vue'))
  : null

const route = useRoute()
const { signIn } = useAuth()

const returnTo = computed(() =>
  typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined,
)

function onSignIn() {
  void signIn(returnTo.value)
}
</script>

<template>
  <section class="signin">
    <h1>Document Library</h1>
    <p>Sign in with your Microsoft 365 account to browse and upload documents.</p>
    <component :is="MockUserPicker" v-if="MockUserPicker" :return-to="returnTo" />
    <fluent-button v-else appearance="primary" @click="onSignIn">
      Sign in with Microsoft
    </fluent-button>
  </section>
</template>

<style scoped>
.signin {
  max-width: 420px;
  margin: 80px auto;
  padding: 32px;
  text-align: center;
  background: var(--colorNeutralBackground1);
  border-radius: var(--borderRadiusLarge);
  box-shadow: var(--shadow4);
}
</style>
