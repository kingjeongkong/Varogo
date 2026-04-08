import Header from '@/components/layout/Header';
import { ProductForm } from '@/features/product/components/ProductForm';

export default function NewProductPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-text-primary font-heading">
            새 제품 분석
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            제품 정보를 입력하면 AI가 마케팅 전략을 분석합니다.
          </p>
        </div>

        <div
          className="glass-card p-6 animate-slide-up"
          style={{ animationDelay: '0.05s', opacity: 0 }}
        >
          <ProductForm />
        </div>
      </main>
    </div>
  );
}
