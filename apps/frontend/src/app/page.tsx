import Link from 'next/link';
import Header from '@/components/layout/Header';
import { ProductList } from '@/features/product/components/ProductList';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-heading">
              내 제품
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              AI 기반 마케팅 전략을 시작하세요.
            </p>
          </div>
          <Link
            href="/product/new"
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            새 제품 분석하기
          </Link>
        </div>

        <ProductList />
      </main>
    </div>
  );
}
