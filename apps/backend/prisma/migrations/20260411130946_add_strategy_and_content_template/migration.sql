-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "channel_recommendation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "core_message" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "why_it_fits" TEXT NOT NULL,
    "content_type_title" TEXT NOT NULL,
    "content_type_description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_content_templates" (
    "id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "overall_tone" TEXT NOT NULL,
    "length_guide" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategies_channel_recommendation_id_idx" ON "strategies"("channel_recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_content_templates_strategy_id_key" ON "strategy_content_templates"("strategy_id");

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_channel_recommendation_id_fkey" FOREIGN KEY ("channel_recommendation_id") REFERENCES "channel_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_content_templates" ADD CONSTRAINT "strategy_content_templates_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
