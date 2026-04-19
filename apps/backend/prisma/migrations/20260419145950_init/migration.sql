-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "one_liner" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "current_traction" JSONB NOT NULL,
    "additional_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "job_to_be_done" TEXT NOT NULL,
    "why_now" TEXT NOT NULL,
    "target_audience" JSONB NOT NULL,
    "value_proposition" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,
    "differentiators" TEXT[],
    "positioning_statement" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "style_fingerprint" JSONB NOT NULL,
    "reference_samples" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_drafts" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "today_input" TEXT,
    "selected_hook_id" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "threads_media_id" TEXT,
    "permalink" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hook_options" (
    "id" TEXT NOT NULL,
    "post_draft_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "angle_label" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hook_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "threads_user_id" TEXT NOT NULL,
    "username" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_id_key" ON "accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "products_user_id_idx" ON "products"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_analyses_product_id_key" ON "product_analyses"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_profiles_user_id_key" ON "voice_profiles"("user_id");

-- CreateIndex
CREATE INDEX "post_drafts_product_id_idx" ON "post_drafts"("product_id");

-- CreateIndex
CREATE INDEX "post_drafts_status_idx" ON "post_drafts"("status");

-- CreateIndex
CREATE INDEX "hook_options_post_draft_id_idx" ON "hook_options"("post_draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "threads_connections_user_id_key" ON "threads_connections"("user_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_drafts" ADD CONSTRAINT "post_drafts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hook_options" ADD CONSTRAINT "hook_options_post_draft_id_fkey" FOREIGN KEY ("post_draft_id") REFERENCES "post_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads_connections" ADD CONSTRAINT "threads_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
