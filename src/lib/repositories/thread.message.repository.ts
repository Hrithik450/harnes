import { db } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { threadMessages, threads } from "@/lib/drizzle/schema";
import { NewThreadMessage, ThreadMessage } from "./types/thread.message.types";
import { normalizeMessageContent } from "@/lib/utils";

export class ThreadMessageRepository {
  static async createMessage(data: NewThreadMessage): Promise<ThreadMessage> {
    const [newMessage] = await db
      .insert(threadMessages)
      .values({
        ...data,
        content: normalizeMessageContent(data.content),
      })
      .onConflictDoUpdate({
        target: threadMessages.id,
        set: {
          content: normalizeMessageContent(data.content),
        },
      })
      .returning();

    await db
      .update(threads)
      .set({ updated_at: new Date() })
      .where(eq(threads.id, data.thread_id));

    return {
      ...newMessage,
      content: normalizeMessageContent(newMessage.content),
    };
  }

  static async getMessagesByThreadId(
    threadId: string,
    userId?: string,
    limit: number = 20,
  ): Promise<ThreadMessage[]> {
    const thread = await db.query.threads.findFirst({
      where: eq(threads.id, threadId),
    });

    if (!thread) {
      throw new Error("Thread not found");
    }

    if (!userId || thread.user_id !== userId) {
      throw new Error("Unauthorized: Thread does not belong to user");
    }

    const messages = await db.query.threadMessages.findMany({
      where: eq(threadMessages.thread_id, threadId),
      orderBy: [desc(threadMessages.created_at)],
      limit,
    });

    return messages.reverse().map((m) => ({
      ...m,
      content: normalizeMessageContent(m.content),
    }));
  }

  static async updateMessageContent(
    messageId: string,
    content: NewThreadMessage["content"],
  ): Promise<ThreadMessage | null> {
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(messageId)) {
      console.warn(
        `[ThreadMessageRepository:updateMessageContent] Cannot update message with invalid UUID: "${messageId}"`,
      );
      return null;
    }

    const [updated] = await db
      .update(threadMessages)
      .set({ content: normalizeMessageContent(content) })
      .where(eq(threadMessages.id, messageId))
      .returning();
    return updated
      ? {
          ...updated,
          content: normalizeMessageContent(updated.content),
        }
      : null;
  }
}
