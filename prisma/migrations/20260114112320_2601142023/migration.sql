-- AlterTable
ALTER TABLE "AssessmentResult" ADD COLUMN     "questionSnapshot" JSONB,
ADD COLUMN     "scoreSnapshot" JSONB;

-- AlterTable
ALTER TABLE "CheckAiResult" ADD COLUMN     "questionSnapshot" JSONB,
ADD COLUMN     "scoreSnapshot" JSONB;
