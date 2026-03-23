-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "org_role_id" UUID;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "level_pub_keys" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "can_edit_surveys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_edit_themes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "encrypted_level_key" TEXT,
ADD COLUMN     "org_role_id" UUID;

-- CreateTable
CREATE TABLE "org_roles" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "data_level" INTEGER NOT NULL,
    "is_builtin" BOOLEAN NOT NULL DEFAULT false,
    "level_pub_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_org_id_slug_key" ON "org_roles"("org_id", "slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_role_id_fkey" FOREIGN KEY ("org_role_id") REFERENCES "org_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
