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

  test('search matches part of a file name (FR-5.2)', async ({ page }) => {
    await signInAs(page, 'anna')
    const search = page.locator('fluent-text-input#search input')

    await search.fill('report')
    await expect(page.locator('tbody')).toContainText('Q3-Report.pdf')

    await search.fill('2027')
    await expect(page.locator('tbody')).toContainText('Budget 2027.xlsx')
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

test.describe('upload', () => {
  const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF') })

  test('uploads a file with tags and adds it to the list (FR-3.1 to FR-3.4)', async ({ page }) => {
    await signInAs(page, 'anna')
    await page.getByTestId('file-input').setInputFiles(pdf('Minutes March.pdf'))

    const tagInput = page.locator('fluent-text-input[placeholder^="Type a tag"] input')
    await tagInput.fill('Minutes')
    await tagInput.press('Enter')
    await button(page, /Upload all/).click()

    await expect(page.locator('.queue')).toContainText('Uploaded')
    const row = page.locator('tbody tr', { hasText: 'Minutes March.pdf' })
    await expect(row).toContainText('minutes')
    await expect(row).toContainText('Anna Muster')
  })

  test('accepts dropped files (FR-3.1)', async ({ page }) => {
    await signInAs(page, 'anna')
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['hi'], 'Dropped.txt', { type: 'text/plain' }))
      return dt
    })
    await page.getByTestId('dropzone').dispatchEvent('drop', { dataTransfer })
    await expect(page.locator('.queue')).toContainText('Dropped.txt')
  })

  test('a name conflict offers rename but not overwrite to others (FR-3.5)', async ({ page }) => {
    // Q3-Report.pdf was uploaded by Ben; the check ignores case (FR-3.7).
    await signInAs(page, 'anna')
    await page.getByTestId('file-input').setInputFiles(pdf('q3-REPORT.pdf'))
    await button(page, /Upload all/).click()

    const dialog = page.locator('fluent-dialog')
    await expect(dialog).toContainText('uploaded by Ben Admin')
    await expect(button(page, 'Overwrite')).toHaveCount(0)

    await button(page, 'Rename').click()
    await expect(page.locator('tbody')).toContainText('q3-REPORT (1).pdf')
  })

  test('admins can overwrite an existing file (FR-3.5)', async ({ page }) => {
    await signInAs(page, 'ben')
    await page.getByTestId('file-input').setInputFiles(pdf('Invoice 2026-0815.pdf'))
    await button(page, /Upload all/).click()

    await button(page, 'Overwrite').click()
    await expect(page.locator('.queue')).toContainText('Uploaded')
    await expect(page.locator('tbody tr', { hasText: 'Invoice 2026-0815.pdf' })).toContainText(
      'Ben Admin',
    )
  })
})
