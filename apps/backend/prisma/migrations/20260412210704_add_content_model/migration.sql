-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contents_strategy_id_key" ON "contents"("strategy_id");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
