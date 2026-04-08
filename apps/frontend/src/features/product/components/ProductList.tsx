'use client';

import Link from 'next/link';
import { useProducts } from '../hooks/use-product';
import { formatDateShort } from '@/lib/utils';

function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-5 w-2/3 mb-3" />
      <div className="skeleton h-4 w-full mb-4" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  );
}

export function ProductList() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-error text-sm">제품 목록을 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-text-muted">아직 분석한 제품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <Link
          key={product.id}
          href={`/product/${product.id}/analysis`}
          className="glass-card p-5 block animate-fade-in"
          style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
        >
          <h3 className="font-heading font-semibold text-text-primary truncate">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-text-muted truncate">{product.url}</p>
          <p className="mt-3 text-xs text-text-muted">
            {formatDateShort(product.createdAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}
