-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "missing_preferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "missing_required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "score_count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
