import { expect, test } from '@playwright/test';
import { ADMIN, CLERK, nav, signIn, unique } from './helpers';

test('a clerk can stock a new title, rent out the last copy and process its return', async ({
  page,
}) => {
  const id = unique();
  const genre = `Noir ${id}`;
  const title = `The Last Copy ${id}`;
  const customer = `Pat Tester ${id}`;

  await signIn(page, CLERK);

  // 1. Create a genre.
  await nav(page, 'Genres').click();
  await page.getByPlaceholder('e.g. Documentary').fill(genre);
  await page.getByRole('button', { name: 'Add genre' }).click();
  await expect(page.getByRole('cell', { name: genre, exact: true })).toBeVisible();

  // 2. Add a movie with a single copy.
  await nav(page, 'Movies').click();
  await page.getByRole('link', { name: 'New movie' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Genre').selectOption({ label: genre });
  await page.getByLabel('Copies in stock').fill('1');
  await page.getByLabel('Daily rental rate (USD)').fill('4.5');
  await page.getByRole('button', { name: 'Add movie' }).click();
  await expect(page.getByText(`Added “${title}” to the catalogue`)).toBeVisible();

  // 3. Register a customer.
  await nav(page, 'Customers').click();
  await page.getByRole('link', { name: 'Add customer' }).click();
  await page.getByLabel('Full name').fill(customer);
  await page.getByLabel('Phone').fill(`555-9${id.slice(0, 3).replace(/\D/g, '7').padEnd(3, '7')}`);
  await page.getByRole('button', { name: 'Add customer' }).click();
  await expect(page.getByRole('heading', { name: customer })).toBeVisible();

  // 4. Rent the movie from the catalogue (movie preselected via the "Rent" shortcut).
  await nav(page, 'Movies').click();
  await page.getByRole('searchbox', { name: 'Search movies' }).fill(title);
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('link', { name: `Rent out ${title}` }).click();
  await page.getByRole('combobox', { name: 'Customer' }).fill(customer);
  await page.getByRole('option', { name: customer }).click();
  await page.getByRole('button', { name: 'Check out' }).click();
  await expect(page.getByText(`“${title}” checked out to ${customer}`)).toBeVisible();

  // 5. The last copy is gone: the movie shows as out of stock and can't be rented.
  await nav(page, 'Movies').click();
  await page.getByRole('searchbox', { name: 'Search movies' }).fill(title);
  const movieRow = page.getByRole('row', { name: new RegExp(title) });
  await expect(movieRow.getByText('Out of stock')).toBeVisible();
  await expect(movieRow.getByRole('link', { name: `Rent out ${title}` })).toHaveCount(0);

  // 6. Process the return; a same-day return is billed as one day.
  await nav(page, 'Rentals').click();
  await page.getByRole('searchbox', { name: 'Search rentals' }).fill(customer);
  const rentalRow = page.getByRole('row', { name: new RegExp(title) });
  await rentalRow.getByRole('button', { name: 'Return' }).click();
  const dialog = page.getByRole('dialog', { name: 'Process return' });
  await expect(dialog.getByText('1 day × $4.50')).toBeVisible();
  await expect(dialog.getByText('$4.50', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm return' }).click();
  await expect(page.getByText(`Charged $4.50 to ${customer}.`)).toBeVisible();

  // 7. It now appears under "Returned" with the fee, and the copy is back on the shelf.
  await page.getByRole('tab', { name: 'Returned' }).click();
  await expect(
    page.getByRole('row', { name: new RegExp(title) }).getByText('$4.50', { exact: true }),
  ).toBeVisible();
  await nav(page, 'Movies').click();
  await page.getByRole('searchbox', { name: 'Search movies' }).fill(title);
  await expect(
    page.getByRole('row', { name: new RegExp(title) }).getByText('1 left'),
  ).toBeVisible();
});

test('a duplicate genre is reported on the field', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto('/genres');
  await page.getByPlaceholder('e.g. Documentary').fill('action');
  await page.getByRole('button', { name: 'Add genre' }).click();
  await expect(page.getByText('A genre with this name already exists')).toBeVisible();
});
