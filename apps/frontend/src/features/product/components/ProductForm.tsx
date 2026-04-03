'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProduct } from '../hooks/use-create-product';

const productSchema = z.object({
  name: z.string().min(1, '제품명을 입력해주세요.'),
  url: z
    .string()
    .url('올바른 URL 형식을 입력해주세요.')
    .optional()
    .or(z.literal('')),
  description: z.string().min(1, '제품 설명을 입력해주세요.'),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm() {
  const router = useRouter();
  const { mutate: createProduct, isPending, error: apiError } = useCreateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', url: '', description: '' },
  });

  function onSubmit(values: ProductFormValues) {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      ...(values.url?.trim() ? { url: values.url.trim() } : {}),
    };

    createProduct(payload, {
      onSuccess: (product) => router.push(`/products/${product.id}`),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {apiError && (
        <div className='bg-error-dim border border-error/20 text-error rounded-lg px-4 py-3 text-sm'>
          {apiError.message}
        </div>
      )}

      <div>
        <label htmlFor='name' className='block text-base font-medium text-text-secondary mb-1.5'>
          제품명 <span className='text-error'>*</span>
        </label>
        <input
          id='name'
          type='text'
          {...register('name')}
          placeholder='예: Varogo'
          className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
            errors.name ? 'border-error/50' : 'border-border'
          }`}
        />
        {errors.name && <p className='mt-1.5 text-xs text-error'>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor='url' className='block text-base font-medium text-text-secondary mb-1.5'>
          제품 URL <span className='text-text-muted font-normal'>(선택)</span>
        </label>
        <input
          id='url'
          type='url'
          {...register('url')}
          placeholder='https://example.com'
          className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors ${
            errors.url ? 'border-error/50' : 'border-border'
          }`}
        />
        {errors.url && <p className='mt-1.5 text-xs text-error'>{errors.url.message}</p>}
      </div>

      <div>
        <label htmlFor='description' className='block text-base font-medium text-text-secondary mb-1.5'>
          제품 설명 <span className='text-error'>*</span>
        </label>
        <textarea
          id='description'
          rows={5}
          {...register('description')}
          placeholder='제품의 기능, 타겟 사용자, 해결하는 문제를 설명해주세요.'
          className={`w-full rounded-lg border bg-surface-elevated px-3 py-2.5 text-base text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-colors ${
            errors.description ? 'border-error/50' : 'border-border'
          }`}
        />
        {errors.description && (
          <p className='mt-1.5 text-xs text-error'>{errors.description.message}</p>
        )}
      </div>

      <div className='flex justify-end gap-3 pt-2'>
        <Link
          href='/'
          className='px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover hover:border-border-hover transition-colors'
        >
          취소
        </Link>
        <button
          type='submit'
          disabled={isPending}
          className='px-5 py-2.5 text-base font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2'
        >
          {isPending && (
            <svg
              className='animate-spin h-4 w-4'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
              />
            </svg>
          )}
          {isPending ? '등록 중...' : '제품 등록'}
        </button>
      </div>
    </form>
  );
}
