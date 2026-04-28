import Link from 'next/link';
import { ProductList } from '@/features/product/components/ProductList';

export default function ProductsPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-heading">
            My Products
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Start an AI-powered marketing strategy.
          </p>
        </div>
        <Link
          href="/product/new"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
        >
          Analyze New Product
        </Link>
      </div>

      <ProductList />
    </main>
  );
}
