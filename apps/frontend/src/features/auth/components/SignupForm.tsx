'use client'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../hooks/use-auth'

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().optional()
})

type FormData = z.infer<typeof schema>

export function SignupForm() {
  const {
    signupMutation: { mutate: signup, isPending, error }
  } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
            이름 <span className="text-text-muted font-normal">(선택)</span>
          </>
        }
        type="text"
        autoComplete="name"
        placeholder="홍길동"
        error={errors.name}
        {...register('name')}
      />
      <FormField
        id="email"
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        error={errors.email}
        {...register('email')}
      />
      <FormField
        id="password"
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        placeholder="8자 이상"
        error={errors.password}
        {...register('password')}
      />
      {error && <Alert>{error.message}</Alert>}
      <Button
        type="submit"
        loading={isPending}
        loadingText="가입 중..."
        className="w-full"
      >
        회원가입
      </Button>
    </form>
  )
}
