import { button, expect, signInAs, test } from './fixtures'

test.describe('files list', () => {
  test('lists the documents with original names and tags (FR-2.2)', async ({ page }) => {
    await signInAs(page, 'anna')
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(5)

    const report = rows.filter({ hasText: 'Q3-Report.pdf' })
    await expect(report).toContainText('finance')
    await expect(report).toContainText('Ben Admin')
  })

  test('search ignores case and also matches tags (FR-5.1, FR-5.2)', async ({ page }) => {
    await signInAs(page, 'anna')
    const search = page.locator('fluent-text-input#search input')

    await search.fill('BUDGET')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody')).toContainText('Budget 2027.xlsx')

    await search.fill('onboard')
    await expect(page.locator('tbody')).toContainText('Onboarding Guide.docx')

    await search.fill('no-such-file')
    await expect(page.locator('tbody')).toContainText('No documents found.')
  })
})

test.describe('Teams deep link', () => {
  test('survives sign-in and filters the list (FR-2.6)', async ({ page }) => {
    await page.goto('/files?name=q3-report.pdf')
    await expect(page).toHaveURL(/\/signin\?returnTo=/)

    await button(page, 'Anna Muster').click()
    await expect(page).toHaveURL(/\/files\?name=q3-report\.pdf$/)

    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Q3-Report.pdf')
  })

  test('to a missing file shows "not found" and can be cleared (FR-2.7)', async ({ page }) => {
    await signInAs(page, 'anna')
    await page.goto('/files?name=gone.pdf')

    await expect(page.getByText(/wasn't found/)).toBeVisible()
    await button(page, 'Clear filter').click()

    await expect(page).toHaveURL(/\/files$/)
    await expect(page.locator('tbody tr')).toHaveCount(5)
  })
})
