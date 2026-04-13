/*
  Warnings:

  - You are about to drop the column `approach` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `content_type_description` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `content_type_title` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `why_it_fits` on the `strategies` table. All the data in the column will be lost.
  - You are about to drop the column `overall_tone` on the `strategy_content_templates` table. All the data in the column will be lost.
  - You are about to drop the column `sections` on the `strategy_content_templates` table. All the data in the column will be lost.
  - Added the required column `call_to_action` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campaign_goal` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_format` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_frequency` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hook_angle` to the `strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body_structure` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content_pattern` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cta_guide` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dont_do_list` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hook_guide` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform_tips` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tone_guide` to the `strategy_content_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "strategies" DROP COLUMN "approach",
DROP COLUMN "content_type_description",
DROP COLUMN "content_type_title",
DROP COLUMN "why_it_fits",
ADD COLUMN     "call_to_action" TEXT NOT NULL,
ADD COLUMN     "campaign_goal" JSONB NOT NULL,
ADD COLUMN     "content_format" TEXT NOT NULL,
ADD COLUMN     "content_frequency" TEXT NOT NULL,
ADD COLUMN     "hook_angle" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "strategy_content_templates" DROP COLUMN "overall_tone",
DROP COLUMN "sections",
ADD COLUMN     "body_structure" JSONB NOT NULL,
ADD COLUMN     "content_pattern" TEXT NOT NULL,
ADD COLUMN     "cta_guide" TEXT NOT NULL,
ADD COLUMN     "dont_do_list" JSONB NOT NULL,
ADD COLUMN     "hook_guide" TEXT NOT NULL,
ADD COLUMN     "platform_tips" JSONB NOT NULL,
ADD COLUMN     "tone_guide" TEXT NOT NULL;
