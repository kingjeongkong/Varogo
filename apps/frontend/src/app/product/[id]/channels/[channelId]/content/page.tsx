'use client';

import { use } from 'react';
import Header from '@/components/layout/Header';
import { ApiError } from '@/lib/http-client';
import { useProduct } from '@/features/product/hooks/use-product';
import { useChannelRecommendations } from '@/features/channel/hooks/use-channel';
import { useContent, useGenerateContent } from '@/features/content/hooks/use-content';
import { useThreadsConnectionStatus, usePublishToThreads } from '@/features/threads/hooks/use-threads-connection';
import { ContentHero } from '@/features/content/components/ContentHero';
import { ContentResultView } from '@/features/content/components/ContentResultView';
import { Button } from '@/components/ui/Button';

export default function ContentPage({
  params,
}: {
  params: Promise<{ id: string; channelId: string }>;
}) {
  const { id, channelId } = use(params);

  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: channels, isLoading: channelsLoading } =
    useChannelRecommendations(id);
  const {
    data: content,
    isLoading: contentLoading,
    error,
  } = useContent(id, channelId);
  const generateMutation = useGenerateContent(id, channelId);
  const { data: threadsConnection } = useThreadsConnectionStatus();
  const publishMutation = usePublishToThreads();

  const is404 = error instanceof ApiError && error.status === 404;
  const isLoading = productLoading || channelsLoading || contentLoading;
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
              콘텐츠를 불러오지 못했습니다.
            </p>
          </div>
        )}

        {generateMutation.isError && !content && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              콘텐츠 생성에 실패했습니다. 다시 시도해 주세요.
            </p>
          </div>
        )}

        {!isLoading && is404 && (
          <div className="space-y-10">
            <ContentHero
              productName={product?.name ?? ''}
              channelName={channel?.channelName ?? ''}
            />
            <div className="glass-card p-8 text-center space-y-4">
              <p className="text-sm text-text-muted">
                아직 생성된 콘텐츠가 없습니다.
              </p>
              <Button
                loading={generateMutation.isPending}
                loadingText="콘텐츠 생성 중..."
                onClick={() => generateMutation.mutate()}
              >
                콘텐츠 생성
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && product && content && (
          <div className="space-y-10">
            <ContentHero
              productName={product.name}
              channelName={channel?.channelName ?? ''}
            />
            <ContentResultView
              content={content}
              threadsConnected={threadsConnection?.connected ?? false}
              onPublish={() => publishMutation.mutate(content.body)}
              isPublishing={publishMutation.isPending}
              publishError={publishMutation.error?.message ?? null}
              publishResult={publishMutation.data ?? null}
            />
          </div>
        )}
      </main>
    </div>
  );
}
