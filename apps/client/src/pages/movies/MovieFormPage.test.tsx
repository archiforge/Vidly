import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RequireAuth } from '../../auth/guards';
import { tokenStorage } from '../../lib/token-storage';
import { adminUser, mockApi, renderRoutes } from '../../test/utils';
import MovieFormPage from './MovieFormPage';

const genre = { _id: '65f0000000000000000000aa', name: 'Drama', createdAt: '', updatedAt: '' };

function setup(createResponse: { status?: number; body?: unknown }) {
  tokenStorage.set('token');
  const api = mockApi({
    'GET /api/auth/me': { body: adminUser },
    'GET /api/genres': { body: [genre] },
    'POST /api/movies': createResponse,
  });
  const view = renderRoutes(
    [
      {
        element: <RequireAuth />,
        children: [
          { path: '/movies/new', element: <MovieFormPage /> },
          { path: '/movies', element: <h1>Movie list</h1> },
        ],
      },
    ],
    '/movies/new',
  );
  return { ...api, ...view };
}

async function fillForm() {
  const title = await screen.findByLabelText('Title');
  await userEvent.type(title, 'Heat');
  await userEvent.selectOptions(screen.getByLabelText('Genre'), 'Drama');
}

describe('MovieFormPage', () => {
  it('creates a movie with numeric fields and returns to the list', async () => {
    const { calls } = setup({ status: 201, body: { _id: 'x', title: 'Heat' } });
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add movie' }));

    expect(await screen.findByRole('heading', { name: 'Movie list' })).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      title: 'Heat',
      genreId: genre._id,
      numberInStock: 1,
      dailyRentalRate: 2.99,
    });
  });

  it('shows server-side field errors next to the field', async () => {
    setup({
      status: 409,
      body: {
        error: {
          message: 'A movie with this title already exists',
          code: 'DUPLICATE',
          details: [{ path: 'title', message: 'A movie with this title already exists' }],
        },
      },
    });
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add movie' }));

    expect(await screen.findByText('A movie with this title already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
  });

  it('requires a genre and a valid stock count', async () => {
    const { calls } = setup({ status: 201, body: {} });
    await userEvent.type(await screen.findByLabelText('Title'), 'Heat');
    await userEvent.clear(screen.getByLabelText('Copies in stock'));
    await userEvent.click(screen.getByRole('button', { name: 'Add movie' }));

    expect(await screen.findByText('Select a genre')).toBeInTheDocument();
    expect(screen.getByText('Enter a number')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});
