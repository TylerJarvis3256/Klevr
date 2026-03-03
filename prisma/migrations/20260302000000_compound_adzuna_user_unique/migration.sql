-- DropIndex
DROP INDEX IF EXISTS "Job_adzuna_id_key";

-- DropIndex
DROP INDEX IF EXISTS "Job_adzuna_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Job_adzuna_id_user_id_key" ON "Job"("adzuna_id", "user_id");
