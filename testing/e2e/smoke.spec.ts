import { expect, test, type Page } from '@playwright/test'

import { SAMPLE_ZIP, newUser } from '../shared/env'

// Smoke tests for the main user flow in the browser, against the running frontend + backend.

async function register(page: Page) {
  const user = newUser()
  await page.goto('/register')
  await page.getByLabel('Full name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByLabel('Confirm password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/app\/documents$/)
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible()
  return user
}

test.afterEach(async ({ page, context }) => {
  // Remove the test account (and its documents) through the API, reusing the browser session.
  const csrf = (await context.cookies()).find((cookie) => cookie.name === 'ase_csrf')
  if (csrf) {
    await page.request.delete('/api/users/me', { headers: { 'X-CSRF-Token': csrf.value } })
  }
})

test('user can register, sign out and sign back in', async ({ page }) => {
  const user = await register(page)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/app\/documents$/)
  await expect(page.getByText('No documents yet.')).toBeVisible()
})

test('user can create a document and upload a ZIP of pages', async ({ page }) => {
  await register(page)

  await page.getByRole('button', { name: 'New document' }).click()
  const dialog = page.getByRole('dialog', { name: 'New document' })
  await dialog.getByLabel('Title').fill('Smoke manuscript')
  await dialog.getByLabel('Description').fill('Uploaded by the e2e smoke test')
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(page).toHaveURL(/\/app\/documents\/[\w-]+\/overview$/)
  await expect(page.getByRole('heading', { name: 'Smoke manuscript' })).toBeVisible()
  await expect(page.getByText('No images yet.')).toBeVisible()

  await page.getByRole('button', { name: 'Import' }).click()
  const fileInput = page.locator('input[type="file"]')
  const uploadForm = page.locator('form').filter({ has: fileInput })
  await fileInput.setInputFiles(SAMPLE_ZIP)
  await uploadForm.getByRole('button', { name: 'Import' }).click()

  await expect(page.getByRole('button', { name: 'Image 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Image 2' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Image 1' })).toBeVisible()

  await page.getByRole('link', { name: 'My documents' }).click()
  await expect(page.getByRole('link', { name: 'Smoke manuscript' })).toBeVisible()
})
