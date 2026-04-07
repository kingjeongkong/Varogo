import type { ChannelRecommendation } from '@/lib/types'

export function getTotalScore(channel: ChannelRecommendation) {
  const { targetPresence, contentFit, alternativeOverlap, earlyAdoption } = channel.scoreBreakdown
  return targetPresence + contentFit + alternativeOverlap + earlyAdoption
}

export function displayChannelName(name: string) {
  return name.replace(/\s*\(.*?\)/, '')
}
