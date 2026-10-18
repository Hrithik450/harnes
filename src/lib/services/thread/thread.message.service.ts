import { ThreadMessageRepository } from "@/lib/repositories/thread.message.repository";
import {
  NewThreadMessage,
  ThreadMessageResponse,
  ThreadMessagesResponse,
} from "@/lib/repositories/types/thread.message.types";

export class ThreadMessageService {
  static async createMessage(
    data: NewThreadMessage,
  ): Promise<ThreadMessageResponse> {
    try {
      const message = await ThreadMessageRepository.createMessage(data);
      return {
        success: true,
        data: message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add message",
      };
    }
  }

  static async getMessagesByThreadId(
    threadId: string,
    userId?: string,
    limit: number = 20,
  ): Promise<ThreadMessagesResponse> {
    try {
      const messages = await ThreadMessageRepository.getMessagesByThreadId(
        threadId,
        userId,
        limit,
      );
      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get messages",
      };
    }
  }

  static async updateMessageContent(
    messageId: string,
    content: NewThreadMessage["content"],
  ): Promise<ThreadMessageResponse> {
    try {
      const message = await ThreadMessageRepository.updateMessageContent(
        messageId,
        content,
      );
      if (!message) {
        return { success: false, error: "Message not found" };
      }
      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update message content",
      };
    }
  }
}
