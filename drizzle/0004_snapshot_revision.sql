CREATE TABLE "practice_sync_state" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"revision" bigint NOT NULL,
	CONSTRAINT "practice_sync_revision_safe" CHECK ("practice_sync_state"."revision" >= 0 and "practice_sync_state"."revision" <= 9007199254740991)
);
