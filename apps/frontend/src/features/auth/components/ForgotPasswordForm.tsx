'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/use-auth';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const {
    forgotPasswordMutation: { mutate: forgotPassword, isPending, isSuccess, error },
  } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (isSuccess) {
    return (
      <div className="space-y-2 text-center">
        <p className="font-semibold">Check your email</p>
        <p className="text-text-muted text-sm">
          We&apos;ve sent a password reset link to your email address.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => forgotPassword(data))}
      noValidate
      className="space-y-5"
    >
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        error={errors.email}
        {...register('email')}
      />
      {error && <Alert>{error.message}</Alert>}
      <Button
        type="submit"
        loading={isPending}
        loadingText="Sending..."
        className="w-full"
      >
        Send reset link
      </Button>
    </form>
  );
}
