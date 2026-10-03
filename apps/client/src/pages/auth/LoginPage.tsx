import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { loginSchema } from '@vidly/shared';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { authApi, usePublicConfig } from '../../api/auth';
import { useAuth } from '../../auth/context';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Form';
import { ApiError, errorMessage } from '../../lib/api-client';
import { AuthLayout, FormAlert } from './AuthLayout';

const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { data: config } = usePublicConfig();
  const login = useMutation({ mutationFn: authApi.login, onSuccess: signIn });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const failure =
    login.error instanceof ApiError && login.error.status === 401
      ? 'That email and password combination is incorrect.'
      : login.error && errorMessage(login.error);

  return (
    <AuthLayout
      title="Sign in to Vidly"
      subtitle="Manage rentals, inventory and customers."
      footer={
        config?.allowRegistration && (
          <>
            New to the team?{' '}
            <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
              Create an account
            </Link>
          </>
        )
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
      >
        {failure && <FormAlert>{failure}</FormAlert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      {showDemoAccounts && (
        <div className="mt-6 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-800">
            Demo accounts (after <code>npm run seed</code>)
          </p>
          <ul className="mt-1.5 space-y-1">
            {[
              ['admin@vidly.dev', 'Admin123!', 'Admin'],
              ['clerk@vidly.dev', 'Clerk123!', 'Clerk'],
            ].map(([email, password, role]) => (
              <li key={email}>
                <button
                  type="button"
                  className="text-left hover:text-brand-700"
                  onClick={() => {
                    setValue('email', email!, { shouldValidate: true });
                    setValue('password', password!, { shouldValidate: true });
                  }}
                >
                  <span className="font-medium">{role}:</span> {email} / {password}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthLayout>
  );
}
