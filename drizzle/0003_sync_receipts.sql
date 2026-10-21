CREATE TABLE "sync_receipts" (
	"owner_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	CONSTRAINT "sync_receipts_owner_id_operation_id_pk" PRIMARY KEY("owner_id","operation_id")
);
