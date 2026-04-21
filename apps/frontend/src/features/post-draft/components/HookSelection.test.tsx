import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HookSelection } from './HookSelection';
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
  selectedHookId: null,
  publishedAt: null,
  threadsMediaId: null,
  permalink: null,
  createdAt: '2026-04-20T00:00:00.000Z',
  updatedAt: '2026-04-20T00:00:00.000Z',
  hooks: [
    {
      id: 'hook-1',
      text: 'Story angle body text',
      angleLabel: 'Story',
      selected: false,
    },
    {
      id: 'hook-2',
      text: 'Data angle body text',
      angleLabel: 'Data',
      selected: false,
    },
    {
      id: 'hook-3',
      text: 'Contrarian angle body text',
      angleLabel: 'Contrarian',
      selected: false,
    },
  ],
};

const SELECTED_ID = 'hook-2';

const COMPLETED_DRAFT: PostDraftResponse = {
  ...PENDING_DRAFT,
  selectedHookId: SELECTED_ID,
  hooks: PENDING_DRAFT.hooks.map((hook) => ({
    ...hook,
    selected: hook.id === SELECTED_ID,
  })),
};

describe('HookSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdatePostDraft();
  });

  describe('awaiting selection (selectedHookId === null)', () => {
    it('renders the Choose a hook heading and three radio cards', () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      expect(
        screen.getByRole('heading', { name: /choose a hook/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('renders each hook text and angle label', () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

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
      render(<HookSelection draft={PENDING_DRAFT} />);

      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeEnabled();
        expect(radio).toHaveAttribute('aria-checked', 'false');
      });
      expect(
        screen.getByRole('button', { name: /save hook/i }),
      ).toBeDisabled();
    });

    it('clicking a card marks it as selected locally without calling mutate', async () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      const [, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(secondCard);

      expect(secondCard).toHaveAttribute('aria-checked', 'true');
      expect(within(secondCard).getByText('Selected')).toBeInTheDocument();
      expect(mockUpdateMutate).not.toHaveBeenCalled();
    });

    it('enables the Save hook button once a card is selected', async () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      const [firstCard] = screen.getAllByRole('radio');
      await userEvent.click(firstCard);

      expect(screen.getByRole('button', { name: /save hook/i })).toBeEnabled();
    });

    it('clicking another card moves the local selection', async () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      const [firstCard, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(firstCard);
      await userEvent.click(secondCard);

      expect(firstCard).toHaveAttribute('aria-checked', 'false');
      expect(secondCard).toHaveAttribute('aria-checked', 'true');
      expect(mockUpdateMutate).not.toHaveBeenCalled();
    });

    it('clicking Save hook calls mutate with the selected hook id', async () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      const [, secondCard] = screen.getAllByRole('radio');
      await userEvent.click(secondCard);
      await userEvent.click(screen.getByRole('button', { name: /save hook/i }));

      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        selectedHookId: 'hook-2',
      });
    });

    it('does not render the Draft saved footer or Back to product link', () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      expect(
        screen.queryByText(/draft saved\. body editor is coming/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /back to product/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render an alert when there is no error', () => {
      render(<HookSelection draft={PENDING_DRAFT} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('mutation pending', () => {
    it('disables every card and shows a loading Save button', () => {
      mockUseUpdatePostDraft({ isPending: true });
      render(<HookSelection draft={PENDING_DRAFT} />);

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
      render(<HookSelection draft={PENDING_DRAFT} />);

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save selection',
      );
    });
  });

  describe('selection completed (selectedHookId !== null)', () => {
    it('marks every card as disabled', () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });

    it('marks the server-selected card with aria-checked=true and shows "Selected"', () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      const radios = screen.getAllByRole('radio');
      const selectedCard = radios[1];
      expect(selectedCard).toHaveAttribute('aria-checked', 'true');
      expect(within(selectedCard).getByText('Selected')).toBeInTheDocument();
    });

    it('leaves unselected cards with aria-checked=false and without the Selected label', () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      const radios = screen.getAllByRole('radio');
      [radios[0], radios[2]].forEach((radio) => {
        expect(radio).toHaveAttribute('aria-checked', 'false');
        expect(within(radio).queryByText('Selected')).not.toBeInTheDocument();
      });
    });

    it('hides the Save hook button in completed state', () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      expect(
        screen.queryByRole('button', { name: /save hook/i }),
      ).not.toBeInTheDocument();
    });

    it('renders the Draft saved guidance and Back to product link', () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      expect(
        screen.getByText(/draft saved\. body editor is coming in the next update\./i),
      ).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /back to product/i });
      expect(link).toHaveAttribute('href', '/product/prod-1/analysis');
    });

    it('does not call mutate when a card is clicked', async () => {
      render(<HookSelection draft={COMPLETED_DRAFT} />);

      const [firstCard] = screen.getAllByRole('radio');
      await userEvent.click(firstCard);

      expect(mockUpdateMutate).not.toHaveBeenCalled();
    });
  });
});
