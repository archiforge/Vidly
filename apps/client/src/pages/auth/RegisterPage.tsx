import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { registerSchema } from '@vidly/shared';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { authApi, usePublicConfig } from '../../api/auth';
import { useAuth } from '../../auth/context';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Form';
import { PageSpinner } from '../../components/ui/Spinner';
import { handleFormError } from '../../lib/form-errors';
import { AuthLayout } from './AuthLayout';

export default function RegisterPage() {
  const { signIn } = useAuth();
  const { data: config, isPending } = usePublicConfig();
  const registration = useMutation({ mutationFn: authApi.register, onSuccess: signIn });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  if (isPending) return <PageSpinner />;

  const footer = (
    <>
      Already have an account?{' '}
      <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
        Sign in
      </Link>
    </>
  );

  if (!config?.allowRegistration) {
    return (
      <AuthLayout
        title="Registration is closed"
        subtitle="Ask an administrator to create an account for you."
      >
        <LinkButton to="/login" className="w-full">
          Back to sign in
        </LinkButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Staff accounts can manage rentals and inventory."
      footer={footer}
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) =>
          registration.mutate(values, {
            onError: (error) => handleFormError(error, setError, ['name', 'email', 'password']),
          }),
        )}
      >
        <TextField
          label="Full name"
          autoComplete="name"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" loading={registration.isPending}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
