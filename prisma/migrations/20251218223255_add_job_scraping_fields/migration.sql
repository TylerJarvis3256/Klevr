-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "final_source_url" TEXT,
ADD COLUMN     "scraping_attempted_at" TIMESTAMP(3),
ADD COLUMN     "scraping_completed_at" TIMESTAMP(3),
ADD COLUMN     "scraping_error" TEXT,
ADD COLUMN     "scraping_method" TEXT,
ADD COLUMN     "scraping_status" "ScrapingStatus" DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Job_scraping_status_idx" ON "Job"("scraping_status");
