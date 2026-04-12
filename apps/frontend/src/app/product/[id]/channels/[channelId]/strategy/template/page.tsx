'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { ApiError } from '@/lib/http-client';
import { useProduct } from '@/features/product/hooks/use-product';
import { useChannelRecommendations } from '@/features/channel/hooks/use-channel';
import { StrategyHero } from '@/features/strategy/components/StrategyHero';
import { ContentTemplateView } from '@/features/strategy/components/ContentTemplateView';
import { useSelectedTemplate } from '@/features/strategy/hooks/use-selected-template';

export default function StrategyTemplatePage({
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
    data: templateData,
    isLoading: templateLoading,
    error,
  } = useSelectedTemplate(id, channelId);

  const is404 = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (is404) {
      router.replace(`/product/${id}/channels/${channelId}/strategy`);
    }
  }, [is404, router, id, channelId]);

  if (is404) return null;

  const isLoading = productLoading || channelsLoading || templateLoading;
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

        {error && !is404 && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              템플릿 정보를 불러오지 못했습니다.
            </p>
          </div>
        )}

        {!isLoading && !error && product && templateData && (
          <div className="space-y-10">
            <StrategyHero
              productName={product.name}
              channelName={channel?.channelName ?? ''}
            />
            <ContentTemplateView
              strategy={templateData.strategy}
              template={templateData.template}
            />
          </div>
        )}
      </main>
    </div>
  );
}
