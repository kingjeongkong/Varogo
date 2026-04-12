import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyCardList } from './StrategyCardList';
import type { StrategyResponse } from '@/lib/types';

const MOCK_STRATEGIES: StrategyResponse[] = [
  {
    id: 'strat-1',
    channelRecommendationId: 'ch-1',
    title: '스토리 기반',
    description: '창업 여정 기반 전략',
    coreMessage: '핵심 메시지 1',
    approach: '접근법 1',
    whyItFits: '적합 이유 1',
    contentTypeTitle: '개인 경험 쓰레드',
    contentTypeDescription: '콘텐츠 타입 설명 1',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'strat-2',
    channelRecommendationId: 'ch-1',
    title: '데이터 기반',
    description: '수치와 데이터 중심 전략',
    coreMessage: '핵심 메시지 2',
    approach: '접근법 2',
    whyItFits: '적합 이유 2',
    contentTypeTitle: '분석 리포트',
    contentTypeDescription: '콘텐츠 타입 설명 2',
    createdAt: '2026-04-10T00:00:00.000Z',
  },
];

describe('StrategyCardList', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders tab buttons for all strategies', () => {
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      expect(
        screen.getByRole('tab', { name: '스토리 기반' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: '데이터 기반' }),
      ).toBeInTheDocument();
    });

    it('renders tablist with accessible label', () => {
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      expect(
        screen.getByRole('tablist', { name: '전략 카드 목록' }),
      ).toBeInTheDocument();
    });

    it('shows first strategy detail by default', () => {
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      expect(screen.getByText('창업 여정 기반 전략')).toBeInTheDocument();
      expect(
        screen.queryByText('수치와 데이터 중심 전략'),
      ).not.toBeInTheDocument();
    });

    it('marks first tab as selected by default', () => {
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      expect(screen.getByRole('tab', { name: '스토리 기반' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: '데이터 기반' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });
  });

  describe('tab switching', () => {
    it('switches to second strategy when second tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      await user.click(screen.getByRole('tab', { name: '데이터 기반' }));

      expect(screen.getByText('수치와 데이터 중심 전략')).toBeInTheDocument();
      expect(
        screen.queryByText('창업 여정 기반 전략'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '데이터 기반' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('interaction', () => {
    it('calls onSelect when the active card is clicked', async () => {
      const user = userEvent.setup();
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={false}
          onSelect={onSelect}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: '전략 선택: 스토리 기반' }),
      );

      expect(onSelect).toHaveBeenCalledWith('strat-1');
    });
  });

  describe('pending state', () => {
    it('disables the active card when isPending is true', () => {
      render(
        <StrategyCardList
          strategies={MOCK_STRATEGIES}
          isPending={true}
          onSelect={onSelect}
        />,
      );

      expect(
        screen.getByRole('button', { name: '전략 선택: 스토리 기반' }),
      ).toBeDisabled();
    });
  });
});
