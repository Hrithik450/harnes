"use server";

import {
  NewThreadMessage,
  ThreadMessageResponse,
} from "@/lib/repositories/types/thread.message.types";
import { ThreadMessageService } from "@/lib/services/thread.message.service";

export async function createMessageAction(
  newMessage: NewThreadMessage,
  tempId?: string,
): Promise<ThreadMessageResponse & { tempId?: string }> {
  const result = await ThreadMessageService.createMessage(newMessage);

  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
      tempId,
    };
  }

  return {
    success: false,
    error: result.error,
    tempId,
  };
}

export async function getMessagesByThreadIdAction(threadId: string) {
  return await ThreadMessageService.getMessagesByThreadId(threadId);
}
