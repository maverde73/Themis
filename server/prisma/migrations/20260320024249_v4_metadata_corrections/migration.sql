/*
  Warnings:

  - You are about to drop the `survey_results` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `channel` on the `report_metadata` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "report_channel" AS ENUM ('PDR125', 'WHISTLEBLOWING');

-- CreateEnum
CREATE TYPE "survey_status" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "survey_results" DROP CONSTRAINT "survey_results_org_id_fkey";

-- AlterTable
ALTER TABLE "report_metadata" DROP COLUMN "channel",
ADD COLUMN     "channel" "report_channel" NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "identity_revealed" DROP NOT NULL,
ALTER COLUMN "identity_revealed" DROP DEFAULT,
ALTER COLUMN "has_attachments" DROP NOT NULL,
ALTER COLUMN "has_attachments" DROP DEFAULT;

-- DropTable
DROP TABLE "survey_results";

-- DropEnum
DROP TYPE "channel";

-- CreateTable
CREATE TABLE "surveys" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "survey_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL,
    "survey_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_shares" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "channel" "report_channel" NOT NULL,
    "share_index" INTEGER NOT NULL,
    "encrypted_share" TEXT NOT NULL,
    "holder_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surveys_org_id_status_idx" ON "surveys"("org_id", "status");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_idx" ON "survey_responses"("survey_id");

-- CreateIndex
CREATE INDEX "survey_responses_org_id_survey_id_idx" ON "survey_responses"("org_id", "survey_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_shares_org_id_channel_share_index_key" ON "escrow_shares"("org_id", "channel", "share_index");

-- CreateIndex
CREATE INDEX "report_metadata_org_id_channel_idx" ON "report_metadata"("org_id", "channel");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_shares" ADD CONSTRAINT "escrow_shares_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
