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
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/product url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/one-liner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/additional information/i)).toBeInTheDocument();
    });

    it('renders stage, users, and revenue radio groups', () => {
      render(<ProductForm />);
      expect(screen.getByText(/product stage/i)).toBeInTheDocument();
      expect(screen.getByText(/user scale/i)).toBeInTheDocument();
      expect(screen.getByText(/monthly revenue/i)).toBeInTheDocument();
    });

    it('renders the submit button', () => {
      render(<ProductForm />);
      expect(
        screen.getByRole('button', { name: /start analysis/i }),
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
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      expect(
        await screen.findByText(/please enter the product name/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when submitting with empty url', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/product name/i), 'My Product');
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      expect(
        await screen.findByText(/please enter a valid url/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when url format is invalid', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/product name/i), 'My Product');
      await userEvent.type(screen.getByLabelText(/product url/i), 'not-a-url');
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      expect(
        await screen.findByText(/please enter a valid url/i),
      ).toBeInTheDocument();
    });

    it('shows url validation error when url does not start with http:// or https://', async () => {
      render(<ProductForm />);
      await userEvent.type(screen.getByLabelText(/product name/i), 'My Product');
      await userEvent.type(
        screen.getByLabelText(/product url/i),
        'ftp://example.com',
      );
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      expect(
        await screen.findByText(
          /url must start with http:\/\/ or https:\/\//i,
        ),
      ).toBeInTheDocument();
    });

    it('does not call createProduct when form is invalid', async () => {
      render(<ProductForm />);
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      await screen.findByText(/please enter the product name/i);
      expect(mockCreateMutate).not.toHaveBeenCalled();
    });
  });

  describe('valid submission', () => {
    async function fillRequiredFields() {
      await userEvent.type(screen.getByLabelText(/product name/i), 'Varogo');
      await userEvent.type(
        screen.getByLabelText(/product url/i),
        'https://varo-go.com',
      );
      await userEvent.type(
        screen.getByLabelText(/one-liner/i),
        'A marketing strategy automation tool',
      );
      await userEvent.click(screen.getByLabelText('Just launched'));
      await userEvent.click(screen.getByLabelText('Under 100'));
      // revenue "None" — users also has "None", so pick the second one
      const noneLabels = screen.getAllByLabelText('None');
      await userEvent.click(noneLabels[1]);
    }

    it('calls createProduct with all required fields on valid submit', async () => {
      render(<ProductForm />);
      await fillRequiredFields();
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Varogo',
          url: 'https://varo-go.com',
          oneLiner: 'A marketing strategy automation tool',
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
        screen.getByLabelText(/additional information/i),
        'Marketing SaaS for indie devs',
      );
      await userEvent.click(screen.getByRole('button', { name: /start analysis/i }));
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
      expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
    });

    it('shows loading text while isPending is true', () => {
      mockUseCreateProduct({ isPending: true });
      render(<ProductForm />);
      expect(
        screen.getByRole('button', { name: /analyzing/i }),
      ).toBeInTheDocument();
    });

    it('shows AnalyzingOverlay while isPending is true', () => {
      mockUseCreateProduct({ isPending: true });
      render(<ProductForm />);
      expect(
        screen.getByText(/AI is analyzing your product/i),
      ).toBeInTheDocument();
    });

    it('does not show AnalyzingOverlay when not pending', () => {
      render(<ProductForm />);
      expect(
        screen.queryByText(/AI is analyzing your product/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('api error', () => {
    it('displays error message when mutation returns an error', () => {
      mockUseCreateProduct({
        error: new Error('Analysis failed. Please try again'),
      });
      render(<ProductForm />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Analysis failed. Please try again',
      );
    });
  });
});
