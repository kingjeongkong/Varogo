/*
  Warnings:

  - You are about to drop the column `comparison_table` on the `product_analyses` table. All the data in the column will be lost.
  - Added the required column `value_proposition` to the `product_analyses` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `keywords` on the `product_analyses` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `current_traction` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `one_liner` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_analyses" DROP COLUMN "comparison_table",
ADD COLUMN     "value_proposition" TEXT NOT NULL,
DROP COLUMN "keywords",
ADD COLUMN     "keywords" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "current_traction" JSONB NOT NULL,
ADD COLUMN     "one_liner" TEXT NOT NULL,
ADD COLUMN     "stage" TEXT NOT NULL;
