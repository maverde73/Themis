-- CreateTable
CREATE TABLE "nostr_events" (
    "id" VARCHAR(64) NOT NULL,
    "pubkey" VARCHAR(64) NOT NULL,
    "kind" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "sig" VARCHAR(128) NOT NULL,
    "created_at" INTEGER NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "nostr_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nostr_events_kind_idx" ON "nostr_events"("kind");

-- CreateIndex
CREATE INDEX "nostr_events_pubkey_idx" ON "nostr_events"("pubkey");
