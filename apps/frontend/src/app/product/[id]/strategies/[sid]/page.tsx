'use client';

import Header from '@/components/layout/Header';
import { ApiError } from '@/lib/http-client';
import { useProduct } from '@/features/product/hooks/use-product';
import { ContentTemplateView } from '@/features/strategy/components/ContentTemplateView';
import { StrategyHero } from '@/features/strategy/components/StrategyHero';
import { useSelectedTemplate } from '@/features/strategy/hooks/use-selected-template';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

export default function StrategyTemplatePage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = use(params);
  const router = useRouter();

  const { data: product, isLoading: productLoading } = useProduct(id);
  const {
    data: templateData,
    isLoading: templateLoading,
    error,
  } = useSelectedTemplate(id);

  const is404 = error instanceof ApiError && error.status === 404;
  const sidMismatch = !!templateData && templateData.strategy.id !== sid;

  useEffect(() => {
    if (is404 || sidMismatch) {
      router.replace(`/product/${id}/strategies`);
    }
  }, [is404, sidMismatch, router, id]);

  if (is404 || sidMismatch) return null;

  const isLoading = productLoading || templateLoading;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-48 w-full mt-6" />
          </div>
        )}

        {error && !is404 && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              템플릿 정보를 불러오지 못했습니다.
            </p>
          </div>
        )}

        {!isLoading && !error && product && templateData && (
          <div className="space-y-10">
            <StrategyHero productName={product.name} />
            <ContentTemplateView
              productId={id}
              strategy={templateData.strategy}
              template={templateData.template}
            />
          </div>
        )}
      </main>
    </div>
  );
}
