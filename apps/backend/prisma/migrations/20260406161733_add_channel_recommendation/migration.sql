-- CreateTable
CREATE TABLE "channel_recommendations" (
    "id" TEXT NOT NULL,
    "product_analysis_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "score_breakdown" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "effective_content" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "effort_level" TEXT NOT NULL,
    "expected_timeline" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_recommendations_product_analysis_id_idx" ON "channel_recommendations"("product_analysis_id");

-- AddForeignKey
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_product_analysis_id_fkey" FOREIGN KEY ("product_analysis_id") REFERENCES "product_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
