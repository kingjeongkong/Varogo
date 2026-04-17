/*
  Warnings:

  - Added the required column `category` to the `product_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_to_be_done` to the `product_analyses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `why_now` to the `product_analyses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_analyses" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "job_to_be_done" TEXT NOT NULL,
ADD COLUMN     "why_now" TEXT NOT NULL;
