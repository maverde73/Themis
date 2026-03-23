-- CreateEnum
CREATE TYPE "form_kind" AS ENUM ('SURVEY', 'REPORT');

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "kind" "form_kind" NOT NULL DEFAULT 'SURVEY';

-- CreateIndex
CREATE INDEX "surveys_org_id_kind_idx" ON "surveys"("org_id", "kind");
