/*
  Warnings:

  - You are about to drop the column `description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `analyses` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `url` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "analyses" DROP CONSTRAINT "analyses_product_id_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "description",
ADD COLUMN     "additional_info" TEXT,
ALTER COLUMN "url" SET NOT NULL;

-- DropTable
DROP TABLE "analyses";

-- CreateTable
CREATE TABLE "product_analyses" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "target" JSONB NOT NULL,
    "problem" JSONB NOT NULL,
    "competitors" JSONB NOT NULL,
    "differentiators" JSONB NOT NULL,
    "positioning_one_liner" TEXT NOT NULL,
    "core_keywords" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_analyses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_analyses" ADD CONSTRAINT "product_analyses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
