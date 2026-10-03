import { createBrowserRouter, type RouteObject } from 'react-router';
import { GuestOnly, RequireAdmin, RequireAuth } from './auth/guards';
import { AppLayout } from './components/layout/AppLayout';
import { PageSpinner } from './components/ui/Spinner';
import { NotFoundPage, RouteErrorBoundary } from './pages/ErrorPages';

/** Code-split each page into its own chunk. */
const page = (
  load: () => Promise<{ default: React.ComponentType }>,
): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <PageSpinner />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', ...page(() => import('./pages/auth/LoginPage')) },
          { path: 'register', ...page(() => import('./pages/auth/RegisterPage')) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, ...page(() => import('./pages/DashboardPage')) },
              { path: 'rentals', ...page(() => import('./pages/rentals/RentalsPage')) },
              { path: 'rentals/new', ...page(() => import('./pages/rentals/NewRentalPage')) },
              { path: 'movies', ...page(() => import('./pages/movies/MoviesPage')) },
              { path: 'movies/new', ...page(() => import('./pages/movies/MovieFormPage')) },
              { path: 'movies/:id/edit', ...page(() => import('./pages/movies/MovieFormPage')) },
              { path: 'customers', ...page(() => import('./pages/customers/CustomersPage')) },
              {
                path: 'customers/new',
                ...page(() => import('./pages/customers/CustomerDetailPage')),
              },
              {
                path: 'customers/:id',
                ...page(() => import('./pages/customers/CustomerDetailPage')),
              },
              { path: 'genres', ...page(() => import('./pages/genres/GenresPage')) },
              { path: 'profile', ...page(() => import('./pages/profile/ProfilePage')) },
              {
                element: <RequireAdmin />,
                children: [{ path: 'users', ...page(() => import('./pages/users/UsersPage')) }],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
