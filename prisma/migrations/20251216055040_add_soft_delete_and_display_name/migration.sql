-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "display_name" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "resume_deleted_at" TIMESTAMP(3);
