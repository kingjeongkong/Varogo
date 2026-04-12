'use client';

import Header from '@/components/layout/Header';
import { useChannelRecommendations } from '@/features/channel/hooks/use-channel';
import { useProduct } from '@/features/product/hooks/use-product';
import { StrategyCardList } from '@/features/strategy/components/StrategyCardList';
import { StrategyHero } from '@/features/strategy/components/StrategyHero';
import {
  useGenerateStrategies,
  useSelectStrategy,
  useStrategies,
} from '@/features/strategy/hooks/use-strategies';
import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';

export default function StrategyPage({
  params,
}: {
  params: Promise<{ id: string; channelId: string }>;
}) {
  const { id, channelId } = use(params);
  const router = useRouter();

  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: channels, isLoading: channelsLoading } =
    useChannelRecommendations(id);
  const {
    data: strategyData,
    isLoading: strategyLoading,
    error,
  } = useStrategies(id, channelId);
  const {
    mutate: generate,
    isPending: generatePending,
    error: generateError,
  } = useGenerateStrategies(id, channelId);
  const { mutate: select, isPending: selectPending } = useSelectStrategy(
    id,
    channelId,
  );

  const isCompleted = strategyData?.status === 'completed';

  useEffect(() => {
    if (isCompleted) {
      router.replace(`/product/${id}/channels/${channelId}/strategy/template`);
    }
  }, [isCompleted, router, id, channelId]);

  if (isCompleted) return null;

  const isLoading = productLoading || channelsLoading || strategyLoading;
  const channel = channels?.find((c) => c.id === channelId);

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

        {error && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              전략 정보를 불러��지 못했습니다.
            </p>
          </div>
        )}

        {!isLoading && !error && product && (
          <div className="space-y-10">
            <StrategyHero
              productName={product.name}
              channelName={channel?.channelName ?? ''}
            />

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
                <button
                  onClick={() => generate()}
                  disabled={generatePending}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatePending ? '전략 생성 중...' : '전략 생성 시작'}
                </button>
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
                        `/product/${id}/channels/${channelId}/strategy/template`,
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
