import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const threads = pgTable("threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const threadMessages = pgTable("thread_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  thread_id: uuid("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<"user" | "assistant" | "system">(),
  content: jsonb("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
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
