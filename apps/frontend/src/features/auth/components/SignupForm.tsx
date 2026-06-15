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
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SignupForm() {
  const {
    signupMutation: { mutate: signup, isPending, error },
  } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form
      onSubmit={handleSubmit((data) => signup(data))}
      noValidate
      className="space-y-5"
    >
      <FormField
        id="name"
        label={
          <>
            Name <span className="text-text-muted font-normal">(optional)</span>
          </>
        }
        type="text"
        autoComplete="name"
        placeholder="Jane Doe"
        error={errors.name}
        {...register('name')}
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        error={errors.email}
        {...register('email')}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="8+ characters"
        error={errors.password}
        {...register('password')}
      />
      {error && <Alert>{error.message}</Alert>}
      <Button
        type="submit"
        loading={isPending}
        loadingText="Signing up..."
        className="w-full"
      >
        Sign up
      </Button>
    </form>
  );
}
