'use client';

import { Suspense, use } from 'react';
import Header from '@/components/layout/Header';
import { PostFlowClient } from '@/features/post-draft/components/PostFlowClient';

export default function NewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Suspense fallback={null}>
          <PostFlowClient productId={id} />
        </Suspense>
      </main>
    </div>
  );
}
