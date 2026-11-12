import { computed } from 'vue'
import { account, isAdmin, signIn, signOut } from '@/auth/msal'

/** Composable for components: who is signed in, and sign-in/out actions. */
export function useAuth() {
  return {
    account,
    isSignedIn: computed(() => account.value !== null),
    displayName: computed(() => account.value?.name ?? account.value?.username ?? ''),
    userId: computed(() => account.value?.localAccountId ?? ''),
    isAdmin: computed(() => isAdmin(account.value)),
    signIn,
    signOut,
  }
}
