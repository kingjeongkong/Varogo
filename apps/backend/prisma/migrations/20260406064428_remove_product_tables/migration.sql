/*
  Warnings:

  - You are about to drop the `product_analyses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_analyses" DROP CONSTRAINT "product_analyses_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_user_id_fkey";

-- DropTable
DROP TABLE "product_analyses";

-- DropTable
DROP TABLE "products";
