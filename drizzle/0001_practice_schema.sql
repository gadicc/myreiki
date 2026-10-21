CREATE TABLE "auth_account" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_account_id_v7" CHECK (substring("auth_account"."id"::text from 15 for 1) = '7' and substring("auth_account"."id"::text from 20 for 1) in ('8', '9', 'a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token"),
	CONSTRAINT "auth_session_id_v7" CHECK (substring("auth_session"."id"::text from 15 for 1) = '7' and substring("auth_session"."id"::text from 20 for 1) in ('8', '9', 'a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"admin" boolean DEFAULT false NOT NULL,
	"practitioner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email"),
	CONSTRAINT "auth_user_id_v7" CHECK (substring("auth_user"."id"::text from 15 for 1) = '7' and substring("auth_user"."id"::text from 20 for 1) in ('8', '9', 'a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_verification_id_v7" CHECK (substring("auth_verification"."id"::text from 15 for 1) = '7' and substring("auth_verification"."id"::text from 20 for 1) in ('8', '9', 'a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "legacy_aliases" (
	"source" text NOT NULL,
	"collection" text NOT NULL,
	"bson_type" text NOT NULL,
	"legacy_id" text NOT NULL,
	"canonical_id" uuid NOT NULL,
	"source_hash" text NOT NULL,
	CONSTRAINT "legacy_aliases_source_collection_bson_type_legacy_id_pk" PRIMARY KEY("source","collection","bson_type","legacy_id"),
	CONSTRAINT "legacy_alias_canonical_v7" CHECK (substring("legacy_aliases"."canonical_id"::text from 15 for 1) = '7' and substring("legacy_aliases"."canonical_id"::text from 20 for 1) in ('8', '9', 'a', 'b'))
);
--> statement-breakpoint
CREATE TABLE "legacy_records" (
	"source" text NOT NULL,
	"collection" text NOT NULL,
	"bson_type" text NOT NULL,
	"legacy_id" text NOT NULL,
	"source_hash" text NOT NULL,
	"ejson" jsonb NOT NULL,
	"disposition" text NOT NULL,
	CONSTRAINT "legacy_records_source_collection_bson_type_legacy_id_pk" PRIMARY KEY("source","collection","bson_type","legacy_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"practice_id" uuid NOT NULL,
	"given_name" text NOT NULL,
	"family_name" text,
	"phone" text,
	"email" text,
	"notes" text,
	"created_at" timestamp with time zone,
	CONSTRAINT "clients_id_practice_unique" UNIQUE("id","practice_id"),
	CONSTRAINT "clients_id_v7" CHECK (substring("clients"."id"::text from 15 for 1) = '7' and substring("clients"."id"::text from 20 for 1) in ('8', '9', 'a', 'b')),
	CONSTRAINT "clients_version_positive" CHECK ("clients"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"country_id" text,
	"phone" text,
	"email" text,
	"website" text,
	"notes" text,
	CONSTRAINT "practices_id_v7" CHECK (substring("practices"."id"::text from 15 for 1) = '7' and substring("practices"."id"::text from 20 for 1) in ('8', '9', 'a', 'b')),
	CONSTRAINT "practices_version_positive" CHECK ("practices"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"practice_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"duration" bigint NOT NULL,
	"type" text NOT NULL,
	"reiki_type" text,
	"body_points" jsonb,
	"notes" text,
	CONSTRAINT "treatments_id_v7" CHECK (substring("treatments"."id"::text from 15 for 1) = '7' and substring("treatments"."id"::text from 20 for 1) in ('8', '9', 'a', 'b')),
	CONSTRAINT "treatments_duration_positive" CHECK ("treatments"."duration" > 0 and "treatments"."duration" <= 9007199254740991),
	CONSTRAINT "treatments_version_positive" CHECK ("treatments"."version" > 0),
	CONSTRAINT "treatments_type_valid" CHECK ("treatments"."type" in ('generic', 'reiki')),
	CONSTRAINT "treatments_reiki_type_valid" CHECK (("treatments"."type" = 'generic' and "treatments"."reiki_type" is null) or ("treatments"."type" = 'reiki' and "treatments"."reiki_type" is not null and "treatments"."reiki_type" in ('regular', 'psychological', 'self', 'distance', 'non-human'))),
	CONSTRAINT "treatments_date_finite" CHECK (isfinite("treatments"."date"))
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_practice_id_practices_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_practitioner_id_auth_user_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_client_practice_fk" FOREIGN KEY ("client_id","practice_id") REFERENCES "public"."clients"("id","practice_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_provider_subject_unique" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_practice_idx" ON "clients" USING btree ("practice_id");--> statement-breakpoint
CREATE INDEX "practices_owner_idx" ON "practices" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "treatments_practice_date_idx" ON "treatments" USING btree ("practice_id","date");