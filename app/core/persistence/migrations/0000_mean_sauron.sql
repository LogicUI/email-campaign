CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"auth_provider" text DEFAULT 'google' NOT NULL,
	"auth_subject" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "app_users_auth_subject_unique" UNIQUE("auth_subject")
);
--> statement-breakpoint
CREATE TABLE "campaign_run_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_run_id" text NOT NULL,
	"email" text NOT NULL,
	"recipient" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"cc_emails" text[],
	"fields_json" jsonb NOT NULL,
	"send_status" text NOT NULL,
	"error_message" text,
	"provider_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"saved_list_id" text,
	"name" text NOT NULL,
	"global_subject" text NOT NULL,
	"global_body_template" text NOT NULL,
	"global_cc_emails" text[],
	"source_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "connection_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"display_host" text NOT NULL,
	"display_database_name" text NOT NULL,
	"display_project_ref" text,
	"last_selected_table" text,
	"sync_mode" text DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_list_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"saved_list_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"email" text,
	"recipient" text,
	"is_valid" boolean NOT NULL,
	"invalid_reason" text,
	"raw_json" jsonb NOT NULL,
	"normalized_fields_json" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"source_file_label" text NOT NULL,
	"row_count" integer NOT NULL,
	"valid_row_count" integer NOT NULL,
	"invalid_row_count" integer NOT NULL,
	"selected_email_column" text,
	"selected_recipient_column" text,
	"schema_snapshot_json" jsonb NOT NULL,
	"source_connection_profile_id" text,
	"destination_table_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_run_recipients" ADD CONSTRAINT "campaign_run_recipients_campaign_run_id_campaign_runs_id_fk" FOREIGN KEY ("campaign_run_id") REFERENCES "public"."campaign_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_runs" ADD CONSTRAINT "campaign_runs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_runs" ADD CONSTRAINT "campaign_runs_saved_list_id_saved_lists_id_fk" FOREIGN KEY ("saved_list_id") REFERENCES "public"."saved_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_profiles" ADD CONSTRAINT "connection_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_list_rows" ADD CONSTRAINT "saved_list_rows_saved_list_id_saved_lists_id_fk" FOREIGN KEY ("saved_list_id") REFERENCES "public"."saved_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_source_connection_profile_id_connection_profiles_id_fk" FOREIGN KEY ("source_connection_profile_id") REFERENCES "public"."connection_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_run_recipients_run_idx" ON "campaign_run_recipients" USING btree ("campaign_run_id","created_at");--> statement-breakpoint
CREATE INDEX "campaign_runs_user_idx" ON "campaign_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "connection_profiles_user_idx" ON "connection_profiles" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "saved_list_rows_list_idx" ON "saved_list_rows" USING btree ("saved_list_id","row_index");--> statement-breakpoint
CREATE INDEX "saved_lists_user_idx" ON "saved_lists" USING btree ("user_id","updated_at");