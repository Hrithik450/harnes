CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"org_id" text,
	"user_id" uuid,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_type" text DEFAULT 'Bearer',
	"scope" text,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'disconnected',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"google_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"picture" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "thread_messages" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_oauth_connections_user_provider" ON "oauth_connections" USING btree ("user_id","provider","status");--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_thread_messages_thread_created" ON "thread_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_thread_messages_content_gin" ON "thread_messages" USING gin ("content");--> statement-breakpoint
CREATE INDEX "idx_threads_user_ordering" ON "threads" USING btree ("user_id","is_default" DESC NULLS LAST,"order_index","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_threads_default_ordering" ON "threads" USING btree ("is_default" DESC NULLS LAST,"order_index","updated_at" DESC NULLS LAST);