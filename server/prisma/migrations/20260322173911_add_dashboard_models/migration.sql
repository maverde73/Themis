-- CreateTable
CREATE TABLE "dashboards" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "survey_id" UUID,
    "channel" TEXT,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "access_level" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "catalog_title" JSONB NOT NULL,
    "catalog_description" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboards_org_id_idx" ON "dashboards"("org_id");

-- CreateIndex
CREATE INDEX "dashboards_org_id_channel_idx" ON "dashboards"("org_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_templates_slug_key" ON "dashboard_templates"("slug");

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
