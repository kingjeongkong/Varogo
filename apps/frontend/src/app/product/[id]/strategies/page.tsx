'use client';

import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/http-client';
import { useProduct } from '@/features/product/hooks/use-product';
import { StrategyCardList } from '@/features/strategy/components/StrategyCardList';
import { StrategyHero } from '@/features/strategy/components/StrategyHero';
import { useSelectedTemplate } from '@/features/strategy/hooks/use-selected-template';
import {
  useGenerateStrategies,
  useSelectStrategy,
  useStrategies,
} from '@/features/strategy/hooks/use-strategies';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

export default function StrategiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: product, isLoading: productLoading } = useProduct(id);
  const {
    data: strategyData,
    isLoading: strategyLoading,
    error,
  } = useStrategies(id);
  const { data: templateData, isLoading: templateLoading } =
    useSelectedTemplate(id);
  const {
    mutate: generate,
    isPending: generatePending,
    error: generateError,
  } = useGenerateStrategies(id);
  const { mutate: select, isPending: selectPending } = useSelectStrategy(id);

  const hasTemplate = !!templateData;
  const selectedSid = templateData?.strategy.id;

  useEffect(() => {
    if (hasTemplate && selectedSid) {
      router.replace(`/product/${id}/strategies/${selectedSid}`);
    }
  }, [hasTemplate, selectedSid, router, id]);

  if (hasTemplate) return null;

  const isLoading = productLoading || strategyLoading || templateLoading;

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

        {error && !(error instanceof ApiError && error.status === 404) && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              전략 정보를 불러오지 못했습니다.
            </p>
          </div>
        )}

        {!isLoading && product && (
          <div className="space-y-10">
            <StrategyHero productName={product.name} />

            {strategyData?.status === 'not_started' && (
              <div className="rounded-xl border border-dashed border-border-hover bg-surface/50 p-10 text-center">
                <p className="text-text-muted mb-4">
                  아직 전략이 생성되지 않았습니다.
                </p>
                {generateError && (
                  <p className="text-error text-sm mb-4">
                    전략 생성에 실패했습니다. 다시 시도해주세요.
                  </p>
                )}
                <Button
                  onClick={() => generate()}
                  loading={generatePending}
                  loadingText="전략 생성 중..."
                >
                  전략 생성 시작
                </Button>
              </div>
            )}

            {strategyData?.status === 'cards_generated' && (
              <StrategyCardList
                strategies={strategyData.strategies}
                isPending={selectPending}
                onSelect={(strategyId) =>
                  select(strategyId, {
                    onSuccess: () =>
                      router.replace(
                        `/product/${id}/strategies/${strategyId}`,
                      ),
                  })
                }
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
