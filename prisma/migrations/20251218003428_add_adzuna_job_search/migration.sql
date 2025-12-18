/*
  Warnings:

  - A unique constraint covering the columns `[adzuna_id]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SavedSearchFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SAVED_SEARCH_NEW_JOBS', 'SYSTEM_ANNOUNCEMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'JOB_DISCOVERED';
ALTER TYPE "ActivityType" ADD VALUE 'SEARCH_PERFORMED';
ALTER TYPE "ActivityType" ADD VALUE 'SEARCH_SAVED';
ALTER TYPE "ActivityType" ADD VALUE 'SAVED_SEARCH_RUN';

-- AlterEnum
ALTER TYPE "JobSource" ADD VALUE 'ADZUNA';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "adzuna_id" TEXT;

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query_config" JSONB NOT NULL,
    "frequency" "SavedSearchFrequency" NOT NULL DEFAULT 'WEEKLY',
    "notify_in_app" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "user_timezone" TEXT DEFAULT 'America/New_York',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearchRun" (
    "id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "new_jobs_count" INTEGER NOT NULL DEFAULT 0,
    "total_jobs_found" INTEGER NOT NULL DEFAULT 0,
    "adzuna_job_ids" TEXT[],
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdzunaRequestLog" (
    "id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "status_code" INTEGER,
    "rate_limited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdzunaRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdzunaSearchCache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdzunaSearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSearch_user_id_idx" ON "SavedSearch"("user_id");

-- CreateIndex
CREATE INDEX "SavedSearch_active_next_run_at_idx" ON "SavedSearch"("active", "next_run_at");

-- CreateIndex
CREATE INDEX "SavedSearchRun_saved_search_id_idx" ON "SavedSearchRun"("saved_search_id");

-- CreateIndex
CREATE INDEX "SavedSearchRun_ran_at_idx" ON "SavedSearchRun"("ran_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_read_at_idx" ON "Notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "AdzunaRequestLog_created_at_idx" ON "AdzunaRequestLog"("created_at");

-- CreateIndex
CREATE INDEX "AdzunaRequestLog_rate_limited_created_at_idx" ON "AdzunaRequestLog"("rate_limited", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "AdzunaSearchCache_cache_key_key" ON "AdzunaSearchCache"("cache_key");

-- CreateIndex
CREATE INDEX "AdzunaSearchCache_cache_key_expires_at_idx" ON "AdzunaSearchCache"("cache_key", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Job_adzuna_id_key" ON "Job"("adzuna_id");

-- CreateIndex
CREATE INDEX "Job_adzuna_id_idx" ON "Job"("adzuna_id");

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearchRun" ADD CONSTRAINT "SavedSearchRun_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
