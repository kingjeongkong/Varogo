'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateProduct } from '../hooks/use-product';

const schema = z.object({
  name: z
    .string()
    .min(1, '제품 이름을 입력해주세요')
    .max(200, '200자 이내로 입력해주세요'),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="glass-card p-8 max-w-sm w-full mx-4 text-center animate-fade-in">
        <div className="relative mx-auto mb-6 h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-primary-dim flex items-center justify-center">
            <Spinner size="md" className="text-primary" />
          </div>
        </div>

        <h3 className="font-heading text-lg font-semibold text-text-primary mb-3">
          AI가 제품을 분석하고 있습니다
        </h3>

        <div className="space-y-2 mb-4">
          {ANALYSIS_STEPS.map((step, i) => (
            <p
              key={step}
              className="text-sm text-text-muted animate-fade-in"
              style={{ animationDelay: `${i * 3}s`, opacity: 0 }}
            >
              {step}...
            </p>
          ))}
        </div>

        <p className="text-xs text-text-muted">약 10~20초 소요됩니다</p>
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
        className="space-y-5"
      >
        <FormField
          id="product-name"
          label="제품 이름"
          type="text"
          placeholder="예: Varogo"
          error={errors.name}
          {...register('name')}
        />
        <FormField
          id="product-url"
          label="제품 URL"
          type="url"
          placeholder="https://example.com"
          error={errors.url}
          {...register('url')}
        />
        <FormField
          id="additional-info"
          label={
            <>
              추가 정보{' '}
              <span className="text-text-muted font-normal">(선택)</span>
            </>
          }
          as="textarea"
          rows={4}
          placeholder="제품의 주요 기능, 타겟 고객 등 AI 분석에 도움이 될 정보를 입력해주세요"
          error={errors.additionalInfo}
          {...register('additionalInfo')}
        />
        {error && <Alert>{error.message}</Alert>}
        <Button
          type="submit"
          loading={isPending}
          loadingText="분석 중..."
          className="w-full"
        >
          분석 시작
        </Button>
      </form>
    </>
  );
}
