import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import type { MessageContent } from "@/lib/types";

export const users = pgTable("users", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey(),
  google_id: text("google_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  picture: text("picture"),
  role: text("role").default("user").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const threads = pgTable(
  "threads",
  {
    id: uuid("id")
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    is_default: boolean("is_default").default(false).notNull(),
    order_index: integer("order_index").default(0).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_threads_user_ordering").on(
      table.user_id,
      table.is_default.desc(),
      table.order_index.asc(),
      table.updated_at.desc(),
    ),
    index("idx_threads_default_ordering").on(
      table.is_default.desc(),
      table.order_index.asc(),
      table.updated_at.desc(),
    ),
  ],
);

export const threadMessages = pgTable(
  "thread_messages",
  {
    id: uuid("id")
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    thread_id: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<"user" | "assistant" | "system">(),
    content: jsonb("content").notNull().$type<MessageContent>(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_thread_messages_thread_created").on(
      table.thread_id,
      table.created_at.asc(),
    ),
    index("idx_thread_messages_content_gin").using("gin", table.content),
  ],
);

export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id")
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    org_id: text("org_id"),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    index("idx_oauth_connections_user_provider").on(
      table.user_id,
      table.provider,
      table.status,
    ),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserInput = typeof users.$inferInsert;
export type ThreadRecord = typeof threads.$inferSelect;
export type NewThreadInput = typeof threads.$inferInsert;
export type ThreadMessageRecord = typeof threadMessages.$inferSelect;
export type NewThreadMessageInput = typeof threadMessages.$inferInsert;
export type OAuthConnectionRecord = typeof oauthConnections.$inferSelect;
export type NewOAuthConnectionInput = typeof oauthConnections.$inferInsert;

export const usersRelations = relations(users, ({ many }) => ({
  threads: many(threads),
  oauthConnections: many(oauthConnections),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(users, {
    fields: [threads.user_id],
    references: [users.id],
  }),
  messages: many(threadMessages),
}));

export const threadMessagesRelations = relations(threadMessages, ({ one }) => ({
  thread: one(threads, {
    fields: [threadMessages.thread_id],
    references: [threads.id],
  }),
}));

export const oauthConnectionsRelations = relations(oauthConnections, ({ one }) => ({
  user: one(users, {
    fields: [oauthConnections.user_id],
    references: [users.id],
  }),
}));
