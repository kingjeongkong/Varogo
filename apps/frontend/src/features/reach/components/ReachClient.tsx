'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ThreadsPost } from '@/lib/types';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useThreadsConnectionStatus } from '@/features/threads';
import { useProducts } from '@/features/product';
import { generateKeywords, discoverPosts } from '../api-client';
import type { KeywordChip } from '../types';
import { PostCard } from './PostCard';

export function ReachClient() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [chips, setChips] = useState<KeywordChip[]>([]);
  const [addInput, setAddInput] = useState('');
  const [posts, setPosts] = useState<ThreadsPost[] | null>(null);

  const {
    data: connection,
    isLoading: connectionLoading,
    error: connectionError,
  } = useThreadsConnectionStatus();

  const {
    data: products,
    isLoading: productsLoading,
  } = useProducts();

  const keywordsMutation = useMutation({
    mutationFn: () => generateKeywords(selectedProductId!),
    onSuccess: (data) => {
      setChips(data.keywords.map((k) => ({ id: crypto.randomUUID(), label: k })));
    },
  });

  const discoverMutation = useMutation({
    mutationFn: () => discoverPosts(chips.map((c) => c.label)),
    onSuccess: (data) => {
      setPosts(data.posts);
    },
  });

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
      <Alert>Failed to load Threads connection status. Please refresh the page.</Alert>
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

  const showKeywordsArea = chips.length > 0 || keywordsMutation.isSuccess || keywordsMutation.isError;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-primary">Reach</h1>
        <p className="mt-1 text-sm text-text-muted">
          Find relevant Threads conversations in your niche and engage to grow your presence
        </p>
      </div>

      {/* Controls section */}
      <section className="glass-card p-6 space-y-5">
        {/* Product select */}
        <div className="space-y-1.5">
          <label
            htmlFor="reach-product-select"
            className="block text-sm font-medium text-text-secondary"
          >
            Product
          </label>
          <select
            id="reach-product-select"
            value={selectedProductId ?? ''}
            onChange={handleProductChange}
            disabled={productsLoading}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            <option value="" disabled>Select a product</option>
            {products?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        {/* Generate keywords button */}
        <Button
          loading={keywordsMutation.isPending}
          loadingText="Generating..."
          disabled={!selectedProductId || keywordsMutation.isPending}
          onClick={() => keywordsMutation.mutate()}
        >
          Generate Keywords
        </Button>

        {keywordsMutation.isError && (
          <Alert>Failed to generate keywords. Please try again.</Alert>
        )}

        {/* Keywords area */}
        {showKeywordsArea && (
          <div className="space-y-3">
            <span className="block text-sm font-medium text-text-secondary">Keywords</span>

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

            {/* Add custom keyword */}
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
          </div>
        )}

        {/* Search button */}
        <Button
          loading={discoverMutation.isPending}
          loadingText="Searching..."
          disabled={chips.length === 0 || discoverMutation.isPending}
          onClick={() => discoverMutation.mutate()}
        >
          Search
        </Button>

        {discoverMutation.isError && (
          <Alert>Failed to search posts. Please try again.</Alert>
        )}
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
