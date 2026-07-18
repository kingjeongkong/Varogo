'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ThreadsPost } from '@/lib/types';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/http-client';
import { useThreadsConnectionStatus } from '@/features/threads';
import { useProducts } from '@/features/product';
import type { KeywordChip, SearchType } from '../types';
import { useGenerateKeywords } from '../hooks/use-generate-keywords';
import { useExplorePosts } from '../hooks/use-explore-posts';
import { PostCard } from './PostCard';

export function ExploreClient() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [chips, setChips] = useState<KeywordChip[]>([]);
  const [addInput, setAddInput] = useState('');
  const [posts, setPosts] = useState<ThreadsPost[] | null>(null);
  const [searchType, setSearchType] = useState<SearchType>('RECENT');

  const {
    data: connection,
    isLoading: connectionLoading,
    error: connectionError,
  } = useThreadsConnectionStatus();

  const {
    data: products,
    isLoading: productsLoading,
  } = useProducts();

  const keywordsMutation = useGenerateKeywords();
  const exploreMutation = useExplorePosts();

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProductId(e.target.value || null);
    setChips([]);
    setPosts(null);
  };

  const handleRemoveChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddChip = () => {
    const trimmed = addInput.trim();
    if (!trimmed) return;
    setChips((prev) => [...prev, { id: crypto.randomUUID(), label: trimmed }]);
    setAddInput('');
  };

  const handleAddInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddChip();
    }
  };

  if (connectionLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Checking Threads connection"
        className="glass-card p-6"
      >
        <div className="skeleton h-5 w-1/3 mb-3" />
        <div className="skeleton h-4 w-2/3" />
      </section>
    );
  }

  if (connectionError) {
    return (
      <Alert>{connectionError.message}</Alert>
    );
  }

  if (!connection?.connected) {
    return (
      <section className="glass-card p-6 space-y-3">
        <h2 className="text-lg font-heading font-semibold text-text-primary">
          Connect Threads first
        </h2>
        <p className="text-sm text-text-muted">
          Connect your Threads account to discover relevant conversations in your niche and grow your presence.
        </p>
        <Link
          href="/integrations"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-base font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary active:scale-[0.97]"
        >
          Go to integrations
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-primary">Explore</h1>
        <p className="mt-1 text-sm text-text-muted">
          Find relevant Threads conversations in your niche and engage to grow your presence
        </p>
      </div>

      {/* Controls section */}
      <section className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-0">

          {/* Left column: Product */}
          <div className="space-y-1.5 md:pr-6 md:border-r md:border-border">
            <label
              htmlFor="explore-product-select"
              className="block text-sm font-medium text-text-secondary"
            >
              Product
            </label>
            <select
              id="explore-product-select"
              value={selectedProductId ?? ''}
              onChange={handleProductChange}
              disabled={productsLoading}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value="" disabled hidden>Select a product</option>
              {products?.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right column: Keywords + actions */}
          <div className="space-y-3 md:pl-6">
            {/* Keywords header row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">Keywords</span>
              <button
                type="button"
                disabled={!selectedProductId || keywordsMutation.isPending}
                onClick={() =>
                  keywordsMutation.mutate(selectedProductId!, {
                    onSuccess: (data) => {
                      setChips(data.keywords.map((k) => ({ id: crypto.randomUUID(), label: k })));
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {keywordsMutation.isPending ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span aria-hidden>✦</span>
                    Generate with AI
                  </>
                )}
              </button>
            </div>

            {keywordsMutation.isError && (
              <Alert>Failed to generate keywords. Please try again.</Alert>
            )}

            {/* Chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-border px-3 py-1 text-sm text-text-secondary"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveChip(chip.id)}
                      aria-label={`Remove keyword ${chip.label}`}
                      className="ml-0.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add keyword input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={handleAddInputKeyDown}
                placeholder="Add a keyword..."
                aria-label="Add custom keyword"
                className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={handleAddChip}
                disabled={!addInput.trim()}
                aria-label="Add keyword"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-surface-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            {/* Search row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-1 items-center gap-3">
                <div
                  role="radiogroup"
                  aria-label="Search type"
                  className="inline-flex shrink-0 rounded-full border border-border bg-surface-elevated p-0.5"
                >
                  {(
                    [
                      { value: 'RECENT', label: 'Latest' },
                      { value: 'TOP', label: 'Top' },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary/50 ${
                        searchType === option.value
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="search-type"
                        value={option.value}
                        checked={searchType === option.value}
                        onChange={() => setSearchType(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                {exploreMutation.isError && (
                  <Alert>
                    <span>{exploreMutation.error.message}</span>
                    {exploreMutation.error instanceof ApiError && exploreMutation.error.code === 'THREADS_TOKEN_EXPIRED' && (
                      <Link href="/integrations" className="ml-2 underline font-medium">
                        Reconnect Threads
                      </Link>
                    )}
                  </Alert>
                )}
              </div>
              <Button
                loading={exploreMutation.isPending}
                loadingText="Searching..."
                disabled={chips.length === 0 || exploreMutation.isPending}
                onClick={() =>
                  exploreMutation.mutate(
                    { keywords: chips.map((c) => c.label), searchType },
                    {
                      onSuccess: (data) => {
                        setPosts(data.posts);
                      },
                    },
                  )
                }
                className="ml-3 shrink-0"
              >
                Search Threads
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Results section */}
      {posts !== null && (
        <section className="space-y-4">
          {posts.length > 0 ? (
            <>
              <p className="text-sm font-medium text-text-secondary">{posts.length} results</p>
              <div className="space-y-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted">
              No results found for these keywords. Try adjusting them.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
