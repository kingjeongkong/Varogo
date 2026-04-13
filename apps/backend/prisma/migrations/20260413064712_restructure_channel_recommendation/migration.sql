-- AlterTable
ALTER TABLE "channel_recommendations" DROP COLUMN "effective_content",
DROP COLUMN "reason",
ADD COLUMN     "content_angle" TEXT NOT NULL,
ADD COLUMN     "distribution_method" TEXT NOT NULL,
ADD COLUMN     "effort_detail" TEXT NOT NULL,
ADD COLUMN     "success_metric" TEXT NOT NULL,
ADD COLUMN     "tier" TEXT NOT NULL,
ADD COLUMN     "why_this_channel" TEXT NOT NULL;
