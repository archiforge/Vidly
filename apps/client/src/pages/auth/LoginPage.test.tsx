import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GuestOnly, RequireAuth } from '../../auth/guards';
import { tokenStorage } from '../../lib/token-storage';
import { adminUser, mockApi, renderRoutes } from '../../test/utils';
import LoginPage from './LoginPage';

const routes = [
  { element: <GuestOnly />, children: [{ path: '/login', element: <LoginPage /> }] },
  { element: <RequireAuth />, children: [{ path: '/', element: <h1>Signed in home</h1> }] },
];

describe('LoginPage', () => {
  it('redirects anonymous visitors to the login page', async () => {
    mockApi({ 'GET /api/config': { body: { allowRegistration: true } } });
    renderRoutes(routes, '/');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('validates input before calling the API', async () => {
    const { calls } = mockApi({ 'GET /api/config': { body: { allowRegistration: false } } });
    renderRoutes(routes, '/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith('/api/auth'))).toHaveLength(0);
    expect(screen.queryByText('Create an account')).not.toBeInTheDocument();
  });

  it('shows a friendly message for wrong credentials', async () => {
    mockApi({
      'GET /api/config': { body: { allowRegistration: true } },
      'POST /api/auth/login': {
        status: 401,
        body: { error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' } },
      },
    });
    renderRoutes(routes, '/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'admin@vidly.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password combination is incorrect.',
    );
  });

  it('stores the session and enters the app on success', async () => {
    const { calls } = mockApi({
      'GET /api/config': { body: { allowRegistration: true } },
      'POST /api/auth/login': { body: { token: 'jwt-token', user: adminUser } },
    });
    renderRoutes(routes, '/login');

    await userEvent.type(await screen.findByLabelText('Email'), ' Admin@Vidly.dev ');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Signed in home' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('jwt-token');
    // The shared schema normalises the email before it is sent.
    expect(calls.find((c) => c.path === '/api/auth/login')?.body).toEqual({
      email: 'admin@vidly.dev',
      password: 'Admin123!',
    });
  });

  it('restores a stored session on load', async () => {
    tokenStorage.set('stored-token');
    mockApi({ 'GET /api/auth/me': { body: adminUser } });
    renderRoutes(routes, '/');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Signed in home' })).toBeInTheDocument(),
    );
  });
});
