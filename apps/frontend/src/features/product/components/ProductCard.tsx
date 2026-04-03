import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatDate, truncate } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const analysisCount = product._count?.analyses ?? 0;

  return (
    <Link href={`/products/${product.id}`} className='block group'>
      <div className='glass-card p-5 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
        <div className='flex items-start justify-between gap-3 mb-3'>
          <h2 className='text-base font-semibold text-text-primary font-heading group-hover:text-primary transition-colors leading-snug'>
            {product.name}
          </h2>
          <span className='shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-dim text-primary border border-primary/20'>
            분석 {analysisCount}회
          </span>
        </div>
        <p className='text-sm text-text-muted leading-relaxed mb-4'>
          {truncate(product.description, 120)}
        </p>
        <div className='flex items-center justify-between'>
          <p className='text-xs text-text-muted'>{formatDate(product.createdAt)} 등록</p>
          <svg className='w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
        </div>
      </div>
    </Link>
  );
}
