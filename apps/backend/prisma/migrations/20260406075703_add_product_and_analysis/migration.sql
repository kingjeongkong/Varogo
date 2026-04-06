-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "additional_info" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "target_audience" JSONB NOT NULL,
    "problem" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,
    "comparison_table" JSONB NOT NULL,
    "differentiators" TEXT[],
    "positioning_statement" TEXT NOT NULL,
    "keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_user_id_idx" ON "products"("user_id");

-- CreateIndex
CREATE INDEX "product_analyses_product_id_idx" ON "product_analyses"("product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
