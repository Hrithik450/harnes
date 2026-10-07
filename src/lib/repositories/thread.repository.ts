import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { threads } from "@/lib/drizzle/schema";
import { Thread, NewThread } from "./types/thread.types";
import { ThreadMessage } from "./types/thread.message.types";

export type ThreadWithMessages = Thread & { messages: ThreadMessage[] };

export class ThreadRepository {
  static async createThread(data: NewThread): Promise<Thread> {
    const [newThread] = await db.insert(threads).values(data).returning();
    return newThread;
  }

  static async getThreads(): Promise<Thread[]> {
    return db.query.threads.findMany({
      orderBy: [desc(threads.updated_at)],
    });
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
    const [updated] = await db
      .update(threads)
      .set({ title, updated_at: new Date() })
      .where(eq(threads.id, id))
      .returning();
    return updated;
  }

  static async deleteThread(id: string): Promise<Thread> {
    const [deleted] = await db
      .delete(threads)
      .where(eq(threads.id, id))
      .returning();
    return deleted;
  }
}
