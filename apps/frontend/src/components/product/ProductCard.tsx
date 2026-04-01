import Link from 'next/link';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const analysisCount = product._count?.analyses ?? 0;
  const truncatedDesc =
    product.description.length > 120
      ? product.description.slice(0, 120) + '...'
      : product.description;

  const formattedDate = new Date(product.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/products/${product.id}`} className='block group'>
      <div className='bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-150'>
        <div className='flex items-start justify-between gap-3 mb-3'>
          <h2 className='text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug'>
            {product.name}
          </h2>
          <span className='shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700'>
            분석 {analysisCount}회
          </span>
        </div>
        <p className='text-sm text-gray-500 leading-relaxed mb-4'>{truncatedDesc}</p>
        <p className='text-xs text-gray-400'>{formattedDate} 등록</p>
      </div>
    </Link>
  );
}
