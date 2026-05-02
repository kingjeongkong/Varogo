import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AngleSelection } from './AngleSelection';
import type { PostDraftResponse } from '@/lib/types';

const mockUpdateMutate = vi.fn();

vi.mock('../hooks/use-post-draft', () => ({
  useUpdatePostDraft: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { useUpdatePostDraft } from '../hooks/use-post-draft';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseUpdatePostDraft(overrides: Record<string, any> = {}) {
  vi.mocked(useUpdatePostDraft).mockReturnValue({
    mutate: mockUpdateMutate,
    isPending: false,
    isError: false,
    error: null,
    variables: undefined,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const PENDING_DRAFT: PostDraftResponse = {
  id: 'draft-1',
  productId: 'prod-1',
  todayInput: 'hit 1000 users',
  body: '',
  status: 'draft',
  selectedOptionId: null,
  publishedAt: null,
  threadsMediaId: null,
  permalink: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  options: [
    {
      id: 'option-1',
      text: 'Story angle body text',
      angleLabel: 'Story',
      selected: false,
    },
    {
      id: 'option-2',
      text: 'Data angle body text',
      angleLabel: 'Data',
      selected: false,
    },
    {
      id: 'option-3',
      text: 'Contrarian angle body text',
      angleLabel: 'Contrarian',
      selected: false,
    },
  ],
};

describe('AngleSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdatePostDraft();
  });

  describe('awaiting selection (selectedOptionId === null)', () => {
    it('renders the Choose an angle heading and three radio cards', () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      expect(
        screen.getByRole('heading', { name: /choose an angle/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('renders each angle option text and label', () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      expect(screen.getByText('Story')).toBeInTheDocument();
      expect(screen.getByText('Data')).toBeInTheDocument();
      expect(screen.getByText('Contrarian')).toBeInTheDocument();
      expect(screen.getByText('Story angle body text')).toBeInTheDocument();
      expect(screen.getByText('Data angle body text')).toBeInTheDocument();
      expect(
        screen.getByText('Contrarian angle body text'),
      ).toBeInTheDocument();
    });

    it('initially shows every card enabled with aria-checked=false and a disabled Save button', () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeEnabled();
        expect(radio).toHaveAttribute('aria-checked', 'false');
      });
      expect(
        screen.getByRole('button', { name: /save angle/i }),
      ).toBeDisabled();
    });

    it('clicking a card marks it as selected locally without calling mutate', async () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      const [, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(secondCard);

      expect(secondCard).toHaveAttribute('aria-checked', 'true');
      expect(within(secondCard).getByText('Selected')).toBeInTheDocument();
      expect(mockUpdateMutate).not.toHaveBeenCalled();
    });

    it('enables the Save angle button once a card is selected', async () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      const [firstCard] = screen.getAllByRole('radio');
      await userEvent.click(firstCard);

      expect(screen.getByRole('button', { name: /save angle/i })).toBeEnabled();
    });

    it('clicking another card moves the local selection', async () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      const [firstCard, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(firstCard);
      await userEvent.click(secondCard);

      expect(firstCard).toHaveAttribute('aria-checked', 'false');
      expect(secondCard).toHaveAttribute('aria-checked', 'true');
      expect(mockUpdateMutate).not.toHaveBeenCalled();
    });

    it('clicking Save angle calls mutate with the selected option id', async () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      const [, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(secondCard);
      await userEvent.click(screen.getByRole('button', { name: /save angle/i }));

      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        selectedOptionId: 'option-2',
      });
    });

    it('does not render the Draft saved footer or Back to product link', () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      expect(
        screen.queryByText(/draft saved\. body editor is coming/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /back to product/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render an alert when there is no error', () => {
      render(<AngleSelection draft={PENDING_DRAFT} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('resuming with selectedOptionId already set', () => {
    const RESUMED_DRAFT: PostDraftResponse = {
      ...PENDING_DRAFT,
      selectedOptionId: 'option-2',
    };

    it('marks the previously selected option as aria-checked on mount', () => {
      render(<AngleSelection draft={RESUMED_DRAFT} />);

      const [first, second, third] = screen.getAllByRole('radio');
      expect(first).toHaveAttribute('aria-checked', 'false');
      expect(second).toHaveAttribute('aria-checked', 'true');
      expect(third).toHaveAttribute('aria-checked', 'false');
    });

    it('enables the Save angle button on mount when an option is preselected', () => {
      render(<AngleSelection draft={RESUMED_DRAFT} />);

      expect(
        screen.getByRole('button', { name: /save angle/i }),
      ).toBeEnabled();
    });
  });

  describe('mutation pending', () => {
    it('disables every card and shows a loading Save button', () => {
      mockUseUpdatePostDraft({ isPending: true });
      render(<AngleSelection draft={PENDING_DRAFT} />);

      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeDisabled();
      });
      expect(
        screen.getByRole('button', { name: /saving/i }),
      ).toBeDisabled();
    });
  });

  describe('mutation error', () => {
    it('renders an alert with the mutation error message', () => {
      mockUseUpdatePostDraft({
        isError: true,
        error: new Error('Failed to save selection'),
      });
      render(<AngleSelection draft={PENDING_DRAFT} />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save selection',
      );
    });
  });

});
