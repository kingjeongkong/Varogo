/*
  Warnings:

  - You are about to drop the column `channel_recommendation_id` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the `channel_recommendations` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `product_analysis_id` to the `strategies` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "channel_recommendations" DROP CONSTRAINT "channel_recommendations_product_analysis_id_fkey";

-- DropForeignKey
ALTER TABLE "strategies" DROP CONSTRAINT "strategies_channel_recommendation_id_fkey";

-- DropIndex
DROP INDEX "strategies_channel_recommendation_id_idx";

-- AlterTable
ALTER TABLE "strategies" DROP COLUMN "channel_recommendation_id",
ADD COLUMN     "product_analysis_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "channel_recommendations";

-- CreateIndex
CREATE INDEX "strategies_product_analysis_id_idx" ON "strategies"("product_analysis_id");

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_product_analysis_id_fkey" FOREIGN KEY ("product_analysis_id") REFERENCES "product_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
