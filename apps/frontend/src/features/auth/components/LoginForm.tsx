'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/use-auth';

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { loginMutation: { mutate: login, isPending, error } } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit((data) => login(data))} noValidate className='space-y-5'>
      <div>
        <label htmlFor="email" className='block text-base font-medium text-text-secondary mb-1.5'>
          이메일
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
          className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
            errors.email ? 'border-error/50' : 'border-border'
          }`}
          placeholder='name@example.com'
        />
        {errors.email && (
          <p id="email-error" role="alert" className='mt-1.5 text-xs text-error'>
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className='block text-base font-medium text-text-secondary mb-1.5'>
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
          className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
            errors.password ? 'border-error/50' : 'border-border'
          }`}
          placeholder='8자 이상'
        />
        {errors.password && (
          <p id="password-error" role="alert" className='mt-1.5 text-xs text-error'>
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <div className='bg-error-dim border border-error/20 text-error rounded-lg px-4 py-3 text-sm' role="alert" aria-live="assertive">
          {error.message}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className='w-full px-4 py-2.5 text-base font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
      >
        {isPending && (
          <svg className='animate-spin h-4 w-4' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
          </svg>
        )}
        {isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}
