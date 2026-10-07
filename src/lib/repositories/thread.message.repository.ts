import { db } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { threadMessages } from "@/lib/drizzle/schema";
import { NewThreadMessage, ThreadMessage } from "./types/thread.message.types";

export class ThreadMessageRepository {
  static async createMessage(data: NewThreadMessage): Promise<ThreadMessage> {
    const [newMessage] = await db
      .insert(threadMessages)
      .values({
        ...data,
      })
      .returning();
    return newMessage;
  }

  static async getMessagesByThreadId(
    threadId: string,
  ): Promise<ThreadMessage[]> {
    return db.query.threadMessages.findMany({
      where: eq(threadMessages.thread_id, threadId),
      orderBy: [asc(threadMessages.created_at)],
    });
  }
}
