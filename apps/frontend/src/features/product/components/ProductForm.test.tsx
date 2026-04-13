import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from './ProductForm';

const mockCreateMutate = vi.fn();

vi.mock('../hooks/use-product', () => ({
  useCreateProduct: vi.fn(),
}));

import { useCreateProduct } from '../hooks/use-product';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockUseCreateProduct(overrides: Record<string, any> = {}) {
  vi.mocked(useCreateProduct).mockReturnValue({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateProduct();
  });

  describe('rendering', () => {
    it('renders name, url, oneLiner, and additionalInfo fields', () => {
      render(<ProductForm />);
      expect(screen.getByLabelText(/제품 이름/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/제품 URL/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/한 줄 소개/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/추가 정보/i)).toBeInTheDocument();
    });

    it('renders stage, users, and revenue radio groups', () => {
      render(<ProductForm />);
      expect(screen.getByText(/제품 단계/i)).toBeInTheDocument();
      expect(screen.getByText(/사용자 규모/i)).toBeInTheDocument();
      expect(screen.getByText(/월 매출/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<ProductForm />);
      expect(
        screen.getByRole('button', { name: /분석 시작/i }),
      ).toBeInTheDocument();
    });

    it('does not show validation errors on initial render', () => {
      render(<ProductForm />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows name validation error when submitting with empty name', async () => {
      render(<ProductForm />);
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(
        await screen.findByText(/제품 이름을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when submitting with empty url', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/제품 이름/i), 'My Product');
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(
        await screen.findByText(/유효한 URL을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when url format is invalid', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/제품 이름/i), 'My Product');
      await userEvent.type(screen.getByLabelText(/제품 URL/i), 'not-a-url');
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(
        await screen.findByText(/유효한 URL을 입력해주세요/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when url does not start with http:// or https://', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/제품 이름/i), 'My Product');
      await userEvent.type(
        screen.getByLabelText(/제품 URL/i),
        'ftp://example.com',
      );
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(
        await screen.findByText(
          /http:\/\/ 또는 https:\/\/로 시작하는 URL을 입력해주세요/i,
        ),
      ).toBeInTheDocument();
    });

    it('does not call createProduct when form is invalid', async () => {
      render(<ProductForm />);
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      await screen.findByText(/제품 이름을 입력해주세요/i);
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    async function fillRequiredFields() {
      await userEvent.type(screen.getByLabelText(/제품 이름/i), 'Varogo');
      await userEvent.type(
        screen.getByLabelText(/제품 URL/i),
        'https://varo-go.com',
      );
      await userEvent.type(
        screen.getByLabelText(/한 줄 소개/i),
        'X 마케팅 전략 자동화 도구',
      );
      await userEvent.click(screen.getByLabelText('막 출시'));
      await userEvent.click(screen.getByLabelText('100명 미만'));
      // revenue "없음" — users also has "없음", so pick the second one
      const noneLabels = screen.getAllByLabelText('없음');
      await userEvent.click(noneLabels[1]);
    }

    it('calls createProduct with all required fields on valid submit', async () => {
      render(<ProductForm />);
      await fillRequiredFields();
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Varogo',
          url: 'https://varo-go.com',
          oneLiner: 'X 마케팅 전략 자동화 도구',
          stage: 'just-launched',
          currentTraction: expect.objectContaining({
            users: 'under-100',
            revenue: 'none',
          }),
        }),
      );
    });

    it('calls createProduct with additionalInfo when provided', async () => {
      render(<ProductForm />);
      await fillRequiredFields();
      await userEvent.type(
        screen.getByLabelText(/추가 정보/i),
        'Marketing SaaS for indie devs',
      );
      await userEvent.click(screen.getByRole('button', { name: /분석 시작/i }));
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Varogo',
          url: 'https://varo-go.com',
          additionalInfo: 'Marketing SaaS for indie devs',
        }),
      );
    });
  });

  describe('loading state', () => {
    it('disables submit button while isPending is true', () => {
      mockUseCreateProduct({ isPending: true });
      render(<ProductForm />);
      expect(screen.getByRole('button', { name: /분석 중/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseCreateProduct({ isPending: true });
      render(<ProductForm />);
      expect(
        screen.getByRole('button', { name: /분석 중/i }),
      ).toBeInTheDocument();
    });

    it('shows AnalyzingOverlay while isPending is true', () => {
      mockUseCreateProduct({ isPending: true });
      render(<ProductForm />);
      expect(
        screen.getByText(/AI가 제품을 분석하고 있습니다/i),
      ).toBeInTheDocument();
    });

    it('does not show AnalyzingOverlay when not pending', () => {
      render(<ProductForm />);
      expect(
        screen.queryByText(/AI가 제품을 분석하고 있습니다/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseCreateProduct({
        error: new Error('분석에 실패했습니다. 다시 시도해주세요'),
      });
      render(<ProductForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        '분석에 실패했습니다. 다시 시도해주세요',
      );
    });
  });
});
