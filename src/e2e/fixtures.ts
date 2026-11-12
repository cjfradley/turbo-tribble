import { test as base, expect, type Page } from '@playwright/test'

/** Sample users from src/mocks/auth.ts. */
export const users = {
  anna: 'Anna Muster',
  ben: 'Ben Admin',
} as const

/**
 * Finds a Fluent button by its text.
 *
 * Fluent UI Web Components set their role through ElementInternals. Chrome exposes that
 * to screen readers correctly (they appear as buttons in its accessibility tree), but
 * Playwright's getByRole() can't read ElementInternals, so it doesn't find them.
 */
export function button(page: Page, name: string | RegExp) {
  return page.locator('fluent-button', { hasText: name })
}

/** Signs in through the mock user picker and waits for the files list. */
export async function signInAs(page: Page, user: keyof typeof users): Promise<void> {
  await page.goto('/signin')
  await button(page, users[user]).click()
  await expect(page).toHaveURL(/\/files/)
}

/** Every test starts with fresh sample data and signed out. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      // Runs before the app on every page load; only reset once per test.
      if (!sessionStorage.getItem('e2e.reset')) {
        localStorage.removeItem('doclib.mock.documents')
        sessionStorage.setItem('e2e.reset', '1')
      }
    })
    await use(page)
  },
})

export { expect }
