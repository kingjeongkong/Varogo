import type { ChannelRecommendation } from '@/lib/types';

export function getTotalScore(channel: ChannelRecommendation) {
  const { targetPresence, contentFit, conversionPotential, earlyAdoption } =
    channel.scoreBreakdown;
  return targetPresence + contentFit + conversionPotential + earlyAdoption;
}

export function displayChannelName(name: string) {
  return name.replace(/\s*\(.*?\)/, '');
}
