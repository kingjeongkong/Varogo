import { ProductForm } from '@/features/product';

export default function NewProductPage() {
  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-2xl font-bold text-text-primary font-heading">
          New Product Analysis
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Enter your product info and AI will analyze a marketing strategy.
        </p>
      </div>

      <div
        className="glass-card p-6 animate-slide-up"
        style={{ animationDelay: '0.05s', opacity: 0 }}
      >
        <ProductForm />
      </div>
    </main>
  );
}
