import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@vidly.dev', password: 'Admin123!' };
export const CLERK = { email: 'clerk@vidly.dev', password: 'Clerk123!' };

export async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/** A suffix that keeps records created by one test run distinct from the next. */
export const unique = () => Date.now().toString(36).slice(-5);

/** A link in the main sidebar navigation. */
export const nav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true });
