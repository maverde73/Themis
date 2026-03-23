-- DropIndex
DROP INDEX IF EXISTS "surveys_org_id_kind_idx";

-- AlterTable: remove kind column from surveys
ALTER TABLE "surveys" DROP COLUMN "kind";

-- DropEnum
DROP TYPE IF EXISTS "form_kind";

-- CreateTable: form_templates
CREATE TABLE "form_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "channel" TEXT,
    "icon" TEXT,
    "catalog_title" JSONB NOT NULL,
    "catalog_description" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_templates_slug_key" ON "form_templates"("slug");
