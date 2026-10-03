import { expect, test } from '@playwright/test';
import { ADMIN, CLERK, nav, signIn, unique } from './helpers';

test('clerks cannot delete records or manage staff', async ({ page }) => {
  await signIn(page, CLERK);

  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Staff' }),
  ).toHaveCount(0);

  await page.goto('/movies');
  await expect(page.getByRole('link', { name: /^Edit / }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0);

  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Administrators only' })).toBeVisible();
});

test('signed-out visitors are sent to sign in and returned to their page afterwards', async ({
  page,
}) => {
  await page.goto('/customers?q=maya');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/customers\?q=maya$/);
  await expect(page.getByRole('link', { name: 'Maya Patel', exact: true })).toBeVisible();
});

test('an invalid stored session sends the user back to sign in', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.evaluate(() => localStorage.setItem('vidly.token', 'tampered.token.value'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a new staff member can register and is signed in as a clerk', async ({ page }) => {
  const email = `new.clerk.${unique()}@vidly.dev`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill('New Clerk');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-passphrase');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: /New Clerk/ }).click();
  await expect(page.getByText('Clerk', { exact: true })).toBeVisible();
});

test('an admin can promote a clerk', async ({ page }) => {
  await signIn(page, ADMIN);
  await nav(page, 'Staff').click();
  const row = page.getByRole('row', { name: /Charlie Clerk/ });
  await row.getByRole('button', { name: 'Make admin' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make admin' }).click();
  await expect(row.getByText('Administrator')).toBeVisible();
  // Restore for other tests.
  await row.getByRole('button', { name: 'Remove admin' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove admin' }).click();
  await expect(row.getByText('Clerk', { exact: true })).toBeVisible();
});
