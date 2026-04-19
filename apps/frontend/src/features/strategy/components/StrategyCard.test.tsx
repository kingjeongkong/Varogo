import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyCard } from './StrategyCard';
import type { StrategyResponse } from '@/lib/types';

const MOCK_STRATEGY: StrategyResponse = {
  id: 'strat-1',
  productAnalysisId: 'pa-1',
  title: '스토리 기반',
  description: '창업 여정과 개인 경험을 중심으로 독자와 감정적 공감대를 형성',
  coreThesis: '진짜 창업자가 겪는 고민을 공유한다',
  campaignGoal: {
    type: 'community',
    description: 'Reddit indiehackers 커뮤니티 내 인지도 구축',
  },
  hookDirection: '일인칭 시점, 실패와 학습을 솔직하게 드러내기',
  ctaDirection: '댓글로 여러분의 경험도 공유해 주세요',
  contentFormat: '개인 경험 쓰레드',
  contentFrequency: '주 2회',
  variationAxes: {
    moment: ['m1', 'm2', 'm3', 'm4'],
    emotion: ['e1', 'e2', 'e3', 'e4'],
    time: ['t1', 't2', 't3', 't4'],
  },
  createdAt: '2026-04-10T00:00:00.000Z',
};

describe('StrategyCard', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders strategy direction fields', () => {
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      expect(screen.getByText('스토리 기반')).toBeInTheDocument();
      expect(
        screen.getByText(
          '창업 여정과 개인 경험을 중심으로 독자와 감정적 공감대를 형성',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('진짜 창업자가 겪는 고민을 공유한다'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('일인칭 시점, 실패와 학습을 솔직하게 드러내기'),
      ).toBeInTheDocument();
    });

    it('renders campaign goal with type badge and description', () => {
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Reddit indiehackers 커뮤니티 내 인지도 구축',
        ),
      ).toBeInTheDocument();
    });

    it('renders call to action', () => {
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      expect(
        screen.getByText('댓글로 여러분의 경험도 공유해 주세요'),
      ).toBeInTheDocument();
    });

    it('renders content format and frequency', () => {
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      expect(screen.getByText('개인 경험 쓰레드')).toBeInTheDocument();
      expect(screen.getByText('주 2회')).toBeInTheDocument();
    });

    it('renders as a button with accessible label', () => {
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      expect(
        screen.getByRole('button', { name: 'Select strategy: 스토리 기반' }),
      ).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onSelect with strategy id on click', async () => {
      const user = userEvent.setup();
      render(<StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />);

      await user.click(
        screen.getByRole('button', { name: 'Select strategy: 스토리 기반' }),
      );

      expect(onSelect).toHaveBeenCalledWith('strat-1');
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('does not call onSelect when disabled', async () => {
      const user = userEvent.setup();
      render(
        <StrategyCard
          strategy={MOCK_STRATEGY}
          disabled
          onSelect={onSelect}
        />,
      );

      const button = screen.getByRole('button', {
        name: 'Select strategy: 스토리 기반',
      });
      expect(button).toBeDisabled();

      await user.click(button);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('pending state', () => {
    it('shows loading text when isPending', () => {
      render(
        <StrategyCard
          strategy={MOCK_STRATEGY}
          isPending
          onSelect={onSelect}
        />,
      );

      expect(screen.getByText('Generating template...')).toBeInTheDocument();
      expect(screen.queryByText('Select this strategy')).not.toBeInTheDocument();
    });

    it('shows default CTA text when not pending', () => {
      render(
        <StrategyCard strategy={MOCK_STRATEGY} onSelect={onSelect} />,
      );

      expect(screen.getByText('Select this strategy')).toBeInTheDocument();
      expect(screen.queryByText('Generating template...')).not.toBeInTheDocument();
    });
  });
});
