import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ContentTemplateView } from './ContentTemplateView';
import type { ContentTemplateResponse, StrategyResponse } from '@/lib/types';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const MOCK_STRATEGY: StrategyResponse = {
  id: 'strat-1',
  productAnalysisId: 'pa-1',
  title: '스토리 기반',
  description: '창업 여정과 개인 경험을 중심으로 독자와 감정적 공감대를 형성',
  coreMessage: '진짜 창업자가 겪는 고민을 공유한다',
  campaignGoal: {
    type: 'community',
    description: 'Reddit indiehackers 커뮤니티 내 인지도 구축',
  },
  hookAngle: '일인칭 시점',
  callToAction: '댓글로 공유해 주세요',
  contentFormat: '개인 경험 쓰레드',
  contentFrequency: '주 2회',
  createdAt: '2026-04-10T00:00:00.000Z',
};

const MOCK_TEMPLATE: ContentTemplateResponse = {
  id: 'tmpl-1',
  strategyId: 'strat-1',
  contentPattern: 'series',
  hookGuide: '첫 문장에서 독자의 호기심을 자극하세요',
  bodyStructure: [
    {
      name: '문제 제시',
      guide: '독자가 공감할 수 있는 문제를 설명',
      exampleSnippet: '저도 처음에는 이 문제로 고민했습니다',
    },
    {
      name: '해결 과정',
      guide: '어떻게 해결했는지 단계별로 설명',
      exampleSnippet: '',
    },
  ],
  ctaGuide: '댓글로 의견을 남겨달라고 요청',
  toneGuide: '친근하고 솔직한 톤',
  lengthGuide: '280자 이내',
  platformTips: ['해시태그 2-3개 사용', '이미지를 첨부하면 도달률 UP'],
  dontDoList: ['과도한 홍보 금지', '링크 스팸 금지'],
  createdAt: '2026-04-10T00:00:00.000Z',
};

const DEFAULT_PROPS = {
  productId: 'prod-1',
  strategy: MOCK_STRATEGY,
  template: MOCK_TEMPLATE,
};

describe('ContentTemplateView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selected strategy summary', () => {
    it('renders strategy title, description, and contentFormat', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('스토리 기반')).toBeInTheDocument();
      expect(
        screen.getByText(
          '창업 여정과 개인 경험을 중심으로 독자와 감정적 공감대를 형성',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('개인 경험 쓰레드')).toBeInTheDocument();
    });
  });

  describe('execution settings section', () => {
    it('renders contentPattern mapped to English label', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('Series')).toBeInTheDocument();
    });

    it('renders lengthGuide', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('280자 이내')).toBeInTheDocument();
    });

    it('maps standalone pattern to Standalone', () => {
      const template = { ...MOCK_TEMPLATE, contentPattern: 'standalone' as const };
      render(<ContentTemplateView {...DEFAULT_PROPS} template={template} />);

      expect(screen.getByText('Standalone')).toBeInTheDocument();
    });

    it('maps one-off pattern to One-off', () => {
      const template = { ...MOCK_TEMPLATE, contentPattern: 'one-off' as const };
      render(<ContentTemplateView {...DEFAULT_PROPS} template={template} />);

      expect(screen.getByText('One-off')).toBeInTheDocument();
    });
  });

  describe('writing guide section', () => {
    it('renders hookGuide text', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(
        screen.getByText('첫 문장에서 독자의 호기심을 자극하세요'),
      ).toBeInTheDocument();
    });

    it('renders bodyStructure sections with name and guide', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('문제 제시')).toBeInTheDocument();
      expect(
        screen.getByText('독자가 공감할 수 있는 문제를 설명'),
      ).toBeInTheDocument();
      expect(screen.getByText('해결 과정')).toBeInTheDocument();
      expect(
        screen.getByText('어떻게 해결했는지 단계별로 설명'),
      ).toBeInTheDocument();
    });

    it('renders exampleSnippet when present and omits when empty', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(
        screen.getByText('저도 처음에는 이 문제로 고민했습니다'),
      ).toBeInTheDocument();
    });

    it('renders ctaGuide text', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(
        screen.getByText('댓글로 의견을 남겨달라고 요청'),
      ).toBeInTheDocument();
    });

    it('renders toneGuide text', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('친근하고 솔직한 톤')).toBeInTheDocument();
    });
  });

  describe('channel rules section', () => {
    it('renders platformTips list items with correct aria-label', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      const tipList = screen.getByRole('list', { name: 'Platform tips list' });
      const tips = within(tipList).getAllByRole('listitem');
      expect(tips).toHaveLength(2);
      expect(tips[0]).toHaveTextContent('해시태그 2-3개 사용');
      expect(tips[1]).toHaveTextContent('이미지를 첨부하면 도달률 UP');
    });

    it('renders dontDoList items with correct aria-label', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      const dontList = screen.getByRole('list', { name: "Don't do list" });
      const items = within(dontList).getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('과도한 홍보 금지');
      expect(items[1]).toHaveTextContent('링크 스팸 금지');
    });
  });

  describe('Step 3 link', () => {
    it('renders link with correct href to content creation page', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      const link = screen.getByRole('link', { name: /Start Writing Content/ });
      expect(link).toHaveAttribute(
        'href',
        '/product/prod-1/strategies/strat-1/content',
      );
    });

    it('renders Step 3 badge text inside the link', () => {
      render(<ContentTemplateView {...DEFAULT_PROPS} />);

      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
  });
});
