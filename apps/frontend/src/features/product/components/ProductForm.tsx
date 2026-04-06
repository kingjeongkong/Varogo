'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProduct } from '../hooks/use-product';

const schema = z.object({
  name: z.string().min(1, '제품 이름을 입력해주세요').max(200, '200자 이내로 입력해주세요'),
  url: z
    .string()
    .url('유효한 URL을 입력해주세요')
    .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
      message: 'http:// 또는 https://로 시작하는 URL을 입력해주세요',
    }),
  additionalInfo: z.string().max(2000, '2000자 이내로 입력해주세요').optional(),
});

type FormData = z.infer<typeof schema>;

const ANALYSIS_STEPS = [
  '제품 정보를 수집하고 있습니다',
  '타겟 고객을 분석하고 있습니다',
  '경쟁 제품을 조사하고 있습니다',
  '차별점을 도출하고 있습니다',
  '포지셔닝 전략을 수립하고 있습니다',
];

function AnalyzingOverlay() {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
      <div className='glass-card p-8 max-w-sm w-full mx-4 text-center animate-fade-in'>
        {/* Pulsing ring */}
        <div className='relative mx-auto mb-6 h-16 w-16'>
          <div className='absolute inset-0 rounded-full border-2 border-primary/30 animate-ping' />
          <div className='absolute inset-0 rounded-full border-2 border-primary/60 animate-pulse' />
          <div className='absolute inset-2 rounded-full bg-primary-dim flex items-center justify-center'>
            <svg className='h-6 w-6 text-primary animate-spin' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
            </svg>
          </div>
        </div>

        <h3 className='font-heading text-lg font-semibold text-text-primary mb-3'>
          AI가 제품을 분석하고 있습니다
        </h3>

        <div className='space-y-2 mb-4'>
          {ANALYSIS_STEPS.map((step, i) => (
            <p
              key={step}
              className='text-sm text-text-muted animate-fade-in'
              style={{ animationDelay: `${i * 3}s`, opacity: 0 }}
            >
              {step}...
            </p>
          ))}
        </div>

        <p className='text-xs text-text-muted'>약 10~20초 소요됩니다</p>
      </div>
    </div>
  );
}

export function ProductForm() {
  const { mutate: create, isPending, error } = useCreateProduct();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <>
      {isPending && <AnalyzingOverlay />}

      <form
        onSubmit={handleSubmit((data) => create(data))}
        noValidate
        className='space-y-5'
      >
        {/* 제품 이름 */}
        <div>
          <label htmlFor='product-name' className='block text-base font-medium text-text-secondary mb-1.5'>
            제품 이름
          </label>
          <input
            id='product-name'
            type='text'
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
            className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
              errors.name ? 'border-error/50' : 'border-border'
            }`}
            placeholder='예: Varogo'
          />
          {errors.name && (
            <p id='name-error' role='alert' className='mt-1.5 text-xs text-error'>
              {errors.name.message}
            </p>
          )}
        </div>

        {/* URL */}
        <div>
          <label htmlFor='product-url' className='block text-base font-medium text-text-secondary mb-1.5'>
            제품 URL
          </label>
          <input
            id='product-url'
            type='url'
            aria-invalid={!!errors.url}
            aria-describedby={errors.url ? 'url-error' : undefined}
            {...register('url')}
            className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
              errors.url ? 'border-error/50' : 'border-border'
            }`}
            placeholder='https://example.com'
          />
          {errors.url && (
            <p id='url-error' role='alert' className='mt-1.5 text-xs text-error'>
              {errors.url.message}
            </p>
          )}
        </div>

        {/* 추가 정보 */}
        <div>
          <label htmlFor='additional-info' className='block text-base font-medium text-text-secondary mb-1.5'>
            추가 정보 <span className='text-text-muted font-normal'>(선택)</span>
          </label>
          <textarea
            id='additional-info'
            rows={4}
            aria-invalid={!!errors.additionalInfo}
            aria-describedby={errors.additionalInfo ? 'info-error' : undefined}
            {...register('additionalInfo')}
            className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors resize-none ${
              errors.additionalInfo ? 'border-error/50' : 'border-border'
            }`}
            placeholder='제품의 주요 기능, 타겟 고객 등 AI 분석에 도움이 될 정보를 입력해주세요'
          />
          {errors.additionalInfo && (
            <p id='info-error' role='alert' className='mt-1.5 text-xs text-error'>
              {errors.additionalInfo.message}
            </p>
          )}
        </div>

        {/* 서버 에러 */}
        {error && (
          <div
            className='bg-error-dim border border-error/20 text-error rounded-lg px-4 py-3 text-sm'
            role='alert'
            aria-live='assertive'
          >
            {error.message}
          </div>
        )}

        {/* 제출 */}
        <button
          type='submit'
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
          {isPending ? '분석 중...' : '분석 시작'}
        </button>
      </form>
    </>
  );
}
