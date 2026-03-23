-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "sequence" SERIAL NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "data_hash" VARCHAR(64) NOT NULL,
    "prev_hash" VARCHAR(64) NOT NULL,
    "chain_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_sequence_idx" ON "audit_log"("sequence");
