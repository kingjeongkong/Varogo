'use client';

import { use } from 'react';
import Header from '@/components/layout/Header';
import { ApiError } from '@/lib/http-client';
import { useProduct } from '@/features/product/hooks/use-product';
import {
  useContent,
  useGenerateContent,
} from '@/features/content/hooks/use-content';
import {
  usePublishToThreads,
  useThreadsConnectionStatus,
} from '@/features/threads/hooks/use-threads-connection';
import { ContentHero } from '@/features/content/components/ContentHero';
import { ContentResultView } from '@/features/content/components/ContentResultView';
import { Button } from '@/components/ui/Button';

export default function ContentPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = use(params);

  const { data: product, isLoading: productLoading } = useProduct(id);
  const {
    data: content,
    isLoading: contentLoading,
    error,
  } = useContent(id, sid);
  const generateMutation = useGenerateContent(id, sid);
  const { data: threadsConnection } = useThreadsConnectionStatus();
  const publishMutation = usePublishToThreads();

  const is404 = error instanceof ApiError && error.status === 404;
  const isLoading = productLoading || contentLoading;

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
              Failed to load content.
            </p>
          </div>
        )}

        {generateMutation.isError && !content && (
          <div className="glass-card p-8 text-center">
            <p className="text-error text-sm">
              Content generation failed. Please try again.
            </p>
          </div>
        )}

        {!isLoading && is404 && (
          <div className="space-y-10">
            <ContentHero productName={product?.name ?? ''} />
            <div className="glass-card p-8 text-center space-y-4">
              <p className="text-sm text-text-muted">
                No content has been generated yet.
              </p>
              <Button
                loading={generateMutation.isPending}
                loadingText="Generating content..."
                onClick={() => generateMutation.mutate()}
              >
                Generate Content
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && product && content && (
          <div className="space-y-10">
            <ContentHero productName={product.name} />
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
