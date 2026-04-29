import { Suspense } from 'react';
import { PostsListClient } from '@/features/post-draft/components/PostsListClient';

export default async function PostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <Suspense fallback={null}>
        <PostsListClient productId={id} />
      </Suspense>
    </main>
  );
}
