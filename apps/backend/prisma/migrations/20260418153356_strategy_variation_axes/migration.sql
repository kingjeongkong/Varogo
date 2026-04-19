/*
  Warnings:

  - You are about to drop the column `call_to_action` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `core_message` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `hook_angle` on the `strategies` table. All the data in the column will be lost.
  - Added the required column `core_thesis` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cta_direction` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hook_direction` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variation_axes` to the `strategies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "strategies" DROP COLUMN "call_to_action",
DROP COLUMN "core_message",
DROP COLUMN "hook_angle",
ADD COLUMN     "core_thesis" TEXT NOT NULL,
ADD COLUMN     "cta_direction" TEXT NOT NULL,
ADD COLUMN     "hook_direction" TEXT NOT NULL,
ADD COLUMN     "variation_axes" JSONB NOT NULL;
