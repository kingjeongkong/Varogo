import Header from '@/components/layout/Header';
import { PostsListClient } from '@/features/post-draft/components/PostsListClient';

export default async function PostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <PostsListClient productId={id} />
      </main>
    </div>
  );
}
