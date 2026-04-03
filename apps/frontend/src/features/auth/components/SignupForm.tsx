'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/use-auth';

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SignupForm() {
  const { signupMutation: { mutate: signup, isPending, error } } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit((data) => signup(data))} noValidate>
      <div>
        <label htmlFor="name">이름 (선택)</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" aria-live="assertive">
          {error.message}
        </p>
      )}
      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? '가입 중...' : '회원가입'}
      </button>
    </form>
  );
}
