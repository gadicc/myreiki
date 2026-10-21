CREATE TABLE "legacy_import" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"source_hash" text NOT NULL,
	"plan_hash" text NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "legacy_import_singleton" CHECK ("legacy_import"."singleton" = true),
	CONSTRAINT "legacy_import_status" CHECK ("legacy_import"."status" in ('prepared', 'complete'))
);
