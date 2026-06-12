'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/use-auth';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const {
    resetPasswordMutation: { mutate: resetPassword, isPending, error },
  } = useAuth();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return <Alert>Invalid or expired reset link</Alert>;
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        resetPassword({ token, newPassword: data.newPassword })
      )}
      noValidate
      className="space-y-5"
    >
      <FormField
        id="newPassword"
        label="New Password"
        type="password"
        autoComplete="new-password"
        placeholder="8+ characters"
        error={errors.newPassword}
        {...register('newPassword')}
      />
      <FormField
        id="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        error={errors.confirmPassword}
        {...register('confirmPassword')}
      />
      {error && <Alert>{error.message}</Alert>}
      <Button
        type="submit"
        loading={isPending}
        loadingText="Resetting password..."
        className="w-full"
      >
        Reset Password
      </Button>
    </form>
  );
}
