'use client';

import { Suspense, use } from 'react';
import { PostFlowClient } from '@/features/post-draft';

export default function NewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <Suspense fallback={null}>
        <PostFlowClient productId={id} />
      </Suspense>
    </main>
  );
}
