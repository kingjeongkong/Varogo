'use client'

import type { ChannelRecommendation } from '@/lib/types'
import { useState } from 'react'
import { displayChannelName, getTotalScore } from '../channel-utils'
import { ChannelCard } from './ChannelCard'

interface ChannelListProps {
  channels: ChannelRecommendation[]
}

export function ChannelList({ channels }: ChannelListProps) {
  const sorted = [...channels].sort((a, b) => getTotalScore(b) - getTotalScore(a))
  const [activeIndex, setActiveIndex] = useState(0)
  const activeChannel = sorted[activeIndex]

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div
        className="animate-fade-in flex w-full rounded-lg border border-border bg-surface-elevated p-1"
        role="tablist"
        aria-label="채널 목록"
      >
        {sorted.map((channel, i) => (
          <button
            key={channel.id}
            role="tab"
            id={`channel-tab-${channel.id}`}
            aria-selected={i === activeIndex}
            aria-controls={`channel-panel-${channel.id}`}
            onClick={() => setActiveIndex(i)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all cursor-pointer text-center
              ${
                i === activeIndex
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            {displayChannelName(channel.channelName)}
          </button>
        ))}
      </div>

      {/* Detail Card */}
      <div
        role="tabpanel"
        id={`channel-panel-${activeChannel.id}`}
        aria-labelledby={`channel-tab-${activeChannel.id}`}
      >
        <ChannelCard key={activeChannel.id} channel={activeChannel} rank={activeIndex} />
      </div>
    </div>
  )
}
