import { button, expect, signInAs, test } from './fixtures'

test.describe('sign-in', () => {
  test('pages need sign-in (FR-1.2)', async ({ page }) => {
    await page.goto('/files')
    await expect(page).toHaveURL(/\/signin\?returnTo=(%2F|\/)files$/)
    await expect(page.getByRole('heading', { name: 'Document Library' })).toBeVisible()
  })

  test('shows the signed-in user and signs out (FR-1.4)', async ({ page }) => {
    await signInAs(page, 'anna')
    await expect(page.locator('header')).toContainText('Anna Muster')

    await button(page, 'Sign out').click()
    await expect(page).toHaveURL(/\/signin/)
  })

  test('marks admins from their app role (FR-1.6)', async ({ page }) => {
    await signInAs(page, 'anna')
    await expect(page.locator('header')).not.toContainText('Admin')

    await button(page, 'Sign out').click()
    await signInAs(page, 'ben')
    await expect(page.locator('header fluent-badge')).toHaveText('Admin')
  })
})
