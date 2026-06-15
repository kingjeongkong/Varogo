'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/use-auth';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const oauthErrorMessages: Record<string, string> = {
  email_conflict: 'An account with this email already exists. Please log in with your email and password.',
  invalid_state: 'Authentication failed. Please try again.',
};

function OAuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (!error) return null;

  const message =
    oauthErrorMessages[error] ?? 'Something went wrong. Please try again.';

  return <Alert>{message}</Alert>;
}

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
      <Suspense fallback={null}>
        <OAuthError />
      </Suspense>
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
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <a
        href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-base font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]"
        aria-label="Continue with Google"
      >
        <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </a>
    </form>
  );
}
