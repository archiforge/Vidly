import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { profileUpdateSchema, registerSchema } from '@vidly/shared';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { useAuth, useCurrentUser } from '../../auth/context';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { TextField } from '../../components/ui/Form';
import { PageHeader } from '../../components/ui/PageHeader';
import { handleFormError } from '../../lib/form-errors';

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: registerSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords don’t match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

function ProfileForm() {
  const user = useCurrentUser();
  const { signIn } = useAuth();
  const update = useMutation({ mutationFn: authApi.updateProfile });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(profileUpdateSchema), defaultValues: { name: user.name } });

  return (
    <Card>
      <CardHeader title="Profile" description="How you appear to other staff." />
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          update.mutate(values, {
            onSuccess: (session) => {
              signIn(session);
              reset({ name: session.user.name });
              toast.success('Profile updated');
            },
            onError: (error) => handleFormError(error, setError, ['name']),
          }),
        )}
      >
        <div className="space-y-5 p-5">
          <TextField
            label="Full name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Email"
            value={user.email}
            disabled
            readOnly
            hint="Contact an administrator to change your email."
          />
          <div className="text-sm">
            <span className="text-zinc-500">Role: </span>
            {user.isAdmin ? <Badge tone="brand">Administrator</Badge> : <Badge>Clerk</Badge>}
          </div>
        </div>
        <div className="flex justify-end border-t border-zinc-100 px-5 py-4">
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const change = useMutation({ mutationFn: authApi.changePassword });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  return (
    <Card>
      <CardHeader title="Password" description="Use at least 8 characters." />
      <form
        noValidate
        onSubmit={handleSubmit(({ currentPassword, newPassword }) =>
          change.mutate(
            { currentPassword, newPassword },
            {
              onSuccess: () => {
                reset();
                toast.success('Password changed');
              },
              onError: (error) =>
                handleFormError(error, setError, ['currentPassword', 'newPassword']),
            },
          ),
        )}
      >
        <div className="space-y-5 p-5">
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <div className="flex justify-end border-t border-zinc-100 px-5 py-4">
          <Button type="submit" loading={change.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Your account" description="Manage your profile and password." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </>
  );
}
