import { ThreadMessageRepository } from "@/lib/repositories/thread.message.repository";
import {
  NewThreadMessage,
  ThreadMessageResponse,
  ThreadMessagesResponse,
} from "../repositories/types/thread.message.types";

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
  ): Promise<ThreadMessagesResponse> {
    try {
      const messages =
        await ThreadMessageRepository.getMessagesByThreadId(threadId);
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
}
