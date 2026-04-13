'use client';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Spinner } from '@/components/ui/Spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateProduct } from '../hooks/use-product';

const STAGE_OPTIONS = [
  { value: 'pre-launch', label: '출시 전' },
  { value: 'just-launched', label: '막 출시' },
  { value: 'growing', label: '성장 중' },
  { value: 'established', label: '안정기' },
] as const;

const USERS_OPTIONS = [
  { value: 'none', label: '없음' },
  { value: 'under-100', label: '100명 미만' },
  { value: '100-1000', label: '100~1,000명' },
  { value: '1000-plus', label: '1,000명 이상' },
] as const;

const REVENUE_OPTIONS = [
  { value: 'none', label: '없음' },
  { value: 'under-1k', label: '$1K 미만' },
  { value: '1k-10k', label: '$1K~$10K' },
  { value: '10k-plus', label: '$10K 이상' },
] as const;

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
  oneLiner: z
    .string()
    .min(1, '한 줄 소개를 입력해주세요')
    .max(300, '300자 이내로 입력해주세요'),
  stage: z.enum(['pre-launch', 'just-launched', 'growing', 'established'], {
    error: '제품 단계를 선택해주세요',
  }),
  currentTraction: z.object({
    users: z.enum(['none', 'under-100', '100-1000', '1000-plus'], {
      error: '사용자 규모를 선택해주세요',
    }),
    revenue: z.enum(['none', 'under-1k', '1k-10k', '10k-plus'], {
      error: '매출 규모를 선택해주세요',
    }),
    socialProof: z.string().max(500, '500자 이내로 입력해주세요').optional(),
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
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <>
      {isPending && <AnalyzingOverlay />}

      <form
        onSubmit={handleSubmit((data) => create(data))}
        noValidate
        className="space-y-8"
      >
        {/* 제품 정체성 */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            제품 정체성
          </legend>
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
            id="product-one-liner"
            label="한 줄 소개"
            type="text"
            placeholder="예: 인디 개발자를 위한 X 마케팅 전략 자동화 도구"
            error={errors.oneLiner}
            {...register('oneLiner')}
          />
        </fieldset>

        {/* 제품 상태 */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            제품 상태
          </legend>
          <Controller
            name="stage"
            control={control}
            render={({ field }) => (
              <RadioGroup
                id="product-stage"
                label="제품 단계"
                options={[...STAGE_OPTIONS]}
                error={errors.stage}
                {...field}
              />
            )}
          />
          <Controller
            name="currentTraction.users"
            control={control}
            render={({ field }) => (
              <RadioGroup
                id="traction-users"
                label="사용자 규모"
                options={[...USERS_OPTIONS]}
                error={errors.currentTraction?.users}
                {...field}
              />
            )}
          />
          <Controller
            name="currentTraction.revenue"
            control={control}
            render={({ field }) => (
              <RadioGroup
                id="traction-revenue"
                label="월 매출"
                options={[...REVENUE_OPTIONS]}
                error={errors.currentTraction?.revenue}
                {...field}
              />
            )}
          />
          <FormField
            id="traction-social-proof"
            label={
              <>
                소셜 프루프{' '}
                <span className="text-text-muted font-normal">(선택)</span>
              </>
            }
            type="text"
            placeholder="예: Product Hunt #3, GitHub 500+ stars"
            error={errors.currentTraction?.socialProof}
            {...register('currentTraction.socialProof')}
          />
        </fieldset>

        {/* 부가 정보 */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            부가 정보
          </legend>
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
        </fieldset>

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
