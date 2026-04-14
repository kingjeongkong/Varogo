-- CreateTable
CREATE TABLE "threads_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "threads_user_id" TEXT NOT NULL,
    "username" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "threads_connections_user_id_key" ON "threads_connections"("user_id");

-- AddForeignKey
ALTER TABLE "threads_connections" ADD CONSTRAINT "threads_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
