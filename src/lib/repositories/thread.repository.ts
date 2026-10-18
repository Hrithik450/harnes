import { db } from "@/lib/db";
import { eq, desc, asc, and, isNull } from "drizzle-orm";
import { threads } from "@/lib/drizzle/schema";
import { Thread, NewThread } from "./types/thread.types";
import { ThreadMessage } from "./types/thread.message.types";

export type ThreadWithMessages = Thread & { messages: ThreadMessage[] };

export const DEFAULT_AGENT_THREADS = [
  {
    title: "Ad Creative",
    order_index: 1,
  },
  {
    title: "Ad Strategist",
    order_index: 2,
  },
] as const;

export class ThreadRepository {
  /**
   * Returns all default agent threads for a specific user.
   */
  static async getDefaultThreadsByUserId(userId: string): Promise<Thread[]> {
    return db
      .select()
      .from(threads)
      .where(and(eq(threads.user_id, userId), eq(threads.is_default, true)));
  }

  /**
   * Transfers all existing unassigned custom chats (user_id IS NULL and is_default = false)
   * to a newly logged-in user and updates their updated_at timestamp.
   */
  static async claimOrphanThreads(userId: string): Promise<number> {
    try {
      const updated = await db
        .update(threads)
        .set({ user_id: userId, updated_at: new Date() })
        .where(and(eq(threads.is_default, false), isNull(threads.user_id)))
        .returning({ id: threads.id });
      return updated.length;
    } catch (e) {
      console.error("[ThreadRepository] Failed to claim orphan threads:", e);
      return 0;
    }
  }

  static async createThread(data: NewThread): Promise<Thread> {
    const [newThread] = await db
      .insert(threads)
      .values({
        user_id: data.user_id,
        title: data.title,
        is_default: data.is_default ?? false,
        order_index: data.order_index ?? 0,
      })
      .returning();
    return newThread;
  }

  static async getThreads(userId?: string): Promise<Thread[]> {
    if (userId) {
      return db.query.threads.findMany({
        where: eq(threads.user_id, userId),
        orderBy: [
          desc(threads.is_default),
          asc(threads.order_index),
          desc(threads.updated_at),
        ],
      });
    }

    // When unauthenticated, return preview placeholder default threads
    return [
      {
        id: "preview-ad-creative",
        title: "Ad Creative",
        is_default: true,
        order_index: 1,
        user_id: null,
        created_at: null,
        updated_at: null,
      },
      {
        id: "preview-ad-strategist",
        title: "Ad Strategist",
        is_default: true,
        order_index: 2,
        user_id: null,
        created_at: null,
        updated_at: null,
      },
    ];
  }

  static async getThreadById(
    id: string,
  ): Promise<ThreadWithMessages | undefined> {
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.created_at)],
        },
      },
    });
    return thread as ThreadWithMessages | undefined;
  }

  static async updateThreadTitle(id: string, title: string): Promise<Thread> {
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
    });
    // Prevent overriding titles of default agent threads
    if (thread?.is_default) {
      return thread;
    }

    const [updated] = await db
      .update(threads)
      .set({ title, updated_at: new Date() })
      .where(eq(threads.id, id))
      .returning();
    return updated;
  }

  static async deleteThread(id: string): Promise<Thread> {
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, id),
    });
    if (thread?.is_default) {
      throw new Error("Default agent threads cannot be deleted.");
    }

    const [deleted] = await db
      .delete(threads)
      .where(eq(threads.id, id))
      .returning();
    return deleted;
  }
}
