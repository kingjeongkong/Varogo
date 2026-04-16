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
  { value: 'pre-launch', label: 'Pre-launch' },
  { value: 'just-launched', label: 'Just launched' },
  { value: 'growing', label: 'Growing' },
  { value: 'established', label: 'Established' },
] as const;

const USERS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'under-100', label: 'Under 100' },
  { value: '100-1000', label: '100–1,000' },
  { value: '1000-plus', label: '1,000+' },
] as const;

const REVENUE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'under-1k', label: 'Under $1K' },
  { value: '1k-10k', label: '$1K–$10K' },
  { value: '10k-plus', label: '$10K+' },
] as const;

const schema = z.object({
  name: z
    .string()
    .min(1, 'Please enter the product name')
    .max(200, 'Must be 200 characters or fewer'),
  url: z
    .string()
    .url('Please enter a valid URL')
    .refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
      message: 'URL must start with http:// or https://',
    }),
  oneLiner: z
    .string()
    .min(1, 'Please enter a one-liner')
    .max(300, 'Must be 300 characters or fewer'),
  stage: z.enum(['pre-launch', 'just-launched', 'growing', 'established'], {
    error: 'Please select a product stage',
  }),
  currentTraction: z.object({
    users: z.enum(['none', 'under-100', '100-1000', '1000-plus'], {
      error: 'Please select a user scale',
    }),
    revenue: z.enum(['none', 'under-1k', '1k-10k', '10k-plus'], {
      error: 'Please select a revenue range',
    }),
    socialProof: z.string().max(500, 'Must be 500 characters or fewer').optional(),
  }),
  additionalInfo: z.string().max(2000, 'Must be 2000 characters or fewer').optional(),
});

type FormData = z.infer<typeof schema>;

const ANALYSIS_STEPS = [
  'Gathering product information',
  'Analyzing target audience',
  'Researching competitors',
  'Identifying differentiators',
  'Building positioning strategy',
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
          AI is analyzing your product
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

        <p className="text-xs text-text-muted">Takes about 10–20 seconds</p>
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
        {/* Product Identity */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            Product Identity
          </legend>
          <FormField
            id="product-name"
            label="Product Name"
            type="text"
            placeholder="e.g., Varogo"
            error={errors.name}
            {...register('name')}
          />
          <FormField
            id="product-url"
            label="Product URL"
            type="url"
            placeholder="https://example.com"
            error={errors.url}
            {...register('url')}
          />
          <FormField
            id="product-one-liner"
            label="One-liner"
            type="text"
            placeholder="e.g., A marketing strategy automation tool for indie developers"
            error={errors.oneLiner}
            {...register('oneLiner')}
          />
        </fieldset>

        {/* Product Status */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            Product Status
          </legend>
          <Controller
            name="stage"
            control={control}
            render={({ field }) => (
              <RadioGroup
                id="product-stage"
                label="Product Stage"
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
                label="User Scale"
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
                label="Monthly Revenue"
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
                Social Proof{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </>
            }
            type="text"
            placeholder="e.g., Product Hunt #3, GitHub 500+ stars"
            error={errors.currentTraction?.socialProof}
            {...register('currentTraction.socialProof')}
          />
        </fieldset>

        {/* Additional Info */}
        <fieldset className="space-y-5">
          <legend className="text-lg font-heading font-semibold text-text-primary">
            Additional Info
          </legend>
          <FormField
            id="additional-info"
            label={
              <>
                Additional Information{' '}
                <span className="text-text-muted font-normal">(optional)</span>
              </>
            }
            as="textarea"
            rows={4}
            placeholder="Enter key features, target customers, and any other context helpful for AI analysis"
            error={errors.additionalInfo}
            {...register('additionalInfo')}
          />
        </fieldset>

        {error && <Alert>{error.message}</Alert>}
        <Button
          type="submit"
          loading={isPending}
          loadingText="Analyzing..."
          className="w-full"
        >
          Start Analysis
        </Button>
      </form>
    </>
  );
}
