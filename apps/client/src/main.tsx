import '@fontsource-variable/inter';
import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthProvider';
import { createQueryClient } from './lib/query-client';
import { createRouter } from './router';

const queryClient = createQueryClient();
const router = createRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
    <Toaster richColors closeButton position="top-right" />
  </StrictMode>,
);
