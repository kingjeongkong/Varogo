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
        <div className='bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm'>
          {apiError.message}
        </div>
      )}

      <div>
        <label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-1'>
          제품명 <span className='text-red-500'>*</span>
        </label>
        <input
          id='name'
          type='text'
          {...register('name')}
          placeholder='예: Varogo'
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.name ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className='mt-1 text-xs text-red-500'>{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor='url' className='block text-sm font-medium text-gray-700 mb-1'>
          제품 URL <span className='text-gray-400 font-normal'>(선택)</span>
        </label>
        <input
          id='url'
          type='url'
          {...register('url')}
          placeholder='https://example.com'
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.url ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.url && <p className='mt-1 text-xs text-red-500'>{errors.url.message}</p>}
      </div>

      <div>
        <label htmlFor='description' className='block text-sm font-medium text-gray-700 mb-1'>
          제품 설명 <span className='text-red-500'>*</span>
        </label>
        <textarea
          id='description'
          rows={5}
          {...register('description')}
          placeholder='제품의 기능, 타겟 사용자, 해결하는 문제를 설명해주세요.'
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
            errors.description ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className='mt-1 text-xs text-red-500'>{errors.description.message}</p>
        )}
      </div>

      <div className='flex justify-end gap-3'>
        <Link
          href='/'
          className='px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          취소
        </Link>
        <button
          type='submit'
          disabled={isPending}
          className='px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2'
        >
          {isPending && (
            <svg
              className='animate-spin h-4 w-4 text-white'
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
