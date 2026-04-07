'use client'

import { use } from 'react'
import Header from '@/components/layout/Header'
import { useProduct } from '@/features/product/hooks/use-product'
import { ChannelHero } from '@/features/channel/components/ChannelHero'
import { ChannelList } from '@/features/channel/components/ChannelList'
import { useAnalyzeChannels, useChannelRecommendations } from '@/features/channel/hooks/use-channel'

export default function ChannelsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: product, isLoading: productLoading } = useProduct(id)
  const { data: channels, isLoading: channelsLoading } = useChannelRecommendations(id)
  const { mutate: analyze, isPending } = useAnalyzeChannels(id)

  const isLoading = productLoading || channelsLoading

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {isLoading && (
          <div className="space-y-4">
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-48 w-full mt-6" />
            <div className="skeleton h-48 w-full" />
          </div>
        )}

        {!isLoading && product && (
          <div className="space-y-10">
            <ChannelHero productName={product.name} />

            {channels && channels.length > 0 ? (
              <ChannelList channels={channels} />
            ) : (
              <div className="rounded-xl border border-dashed border-border-hover bg-surface/50 p-10 text-center">
                <p className="text-text-muted mb-4">
                  아직 채널 분석이 진행되지 않았습니다.
                </p>
                <button
                  onClick={() => analyze()}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? '분석 중...' : '채널 분석 시작'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
