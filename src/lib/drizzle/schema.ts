import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  title: text("title"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const threadMessages = pgTable("thread_messages", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  thread_id: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<"user" | "assistant" | "system">(),
  content: jsonb("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  org_id: text("org_id"),
  user_id: text("user_id"),
  provider: text("provider").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  token_type: text("token_type").default("Bearer"),
  scope: text("scope"),
  expires_at: timestamp("expires_at", { withTimezone: true }),
  status: text("status")
    .$type<"connected" | "expired" | "disconnected">()
    .default("disconnected"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const threadsRelations = relations(threads, ({ many }) => ({
  messages: many(threadMessages),
}));

export const threadMessagesRelations = relations(threadMessages, ({ one }) => ({
  thread: one(threads, {
    fields: [threadMessages.thread_id],
    references: [threads.id],
  }),
}));
