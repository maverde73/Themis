-- AlterTable
ALTER TABLE "users" ADD COLUMN     "encrypted_key_blob" TEXT,
ADD COLUMN     "key_backup_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nostr_pubkey" VARCHAR(128);
