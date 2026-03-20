-- CreateEnum
CREATE TYPE "role" AS ENUM ('RPG', 'ODV', 'ADMIN');

-- CreateEnum
CREATE TYPE "plan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "channel" AS ENUM ('PDR125', 'WHISTLEBLOWING');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESPONSE_GIVEN', 'CLOSED_FOUNDED', 'CLOSED_UNFOUNDED', 'CLOSED_BAD_FAITH');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "org_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "plan" NOT NULL DEFAULT 'STARTER',
    "rpg_public_key" TEXT,
    "odv_public_key" TEXT,
    "relay_urls" JSONB NOT NULL DEFAULT '[]',
    "pairing_qr_data" JSONB,
    "wb_sla_ack_days" INTEGER NOT NULL DEFAULT 7,
    "wb_sla_response_days" INTEGER NOT NULL DEFAULT 90,
    "pdr_sla_ack_days" INTEGER NOT NULL DEFAULT 3,
    "pdr_sla_response_days" INTEGER NOT NULL DEFAULT 45,
    "subscription_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_metadata" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "channel" "channel" NOT NULL,
    "category" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'RECEIVED',
    "identity_revealed" BOOLEAN NOT NULL DEFAULT false,
    "has_attachments" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "response_given_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "sla_ack_deadline" TIMESTAMP(3),
    "sla_response_deadline" TIMESTAMP(3),
    "sla_ack_met" BOOLEAN,
    "sla_response_met" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_results" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "survey_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "response_value" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "report_metadata_org_id_channel_idx" ON "report_metadata"("org_id", "channel");

-- CreateIndex
CREATE INDEX "report_metadata_org_id_status_idx" ON "report_metadata"("org_id", "status");

-- CreateIndex
CREATE INDEX "report_metadata_sla_ack_deadline_idx" ON "report_metadata"("sla_ack_deadline");

-- CreateIndex
CREATE INDEX "report_metadata_sla_response_deadline_idx" ON "report_metadata"("sla_response_deadline");

-- CreateIndex
CREATE INDEX "survey_results_org_id_survey_id_idx" ON "survey_results"("org_id", "survey_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_metadata" ADD CONSTRAINT "report_metadata_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_results" ADD CONSTRAINT "survey_results_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
