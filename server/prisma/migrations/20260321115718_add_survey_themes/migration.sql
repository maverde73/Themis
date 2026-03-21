/*
  Warnings:

  - You are about to drop the column `catalog_title` on the `form_templates` table. All the data in the column will be lost.
  - Added the required column `catalogTitle` to the `form_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "form_templates" DROP COLUMN "catalog_title",
ADD COLUMN     "catalogTitle" JSONB NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "theme_id" UUID;

-- CreateTable
CREATE TABLE "survey_themes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "cloned_from" UUID,
    "created_by" UUID,
    "org_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_themes_org_id_idx" ON "survey_themes"("org_id");

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "survey_themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_themes" ADD CONSTRAINT "survey_themes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_themes" ADD CONSTRAINT "survey_themes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
