"use server";

import {
  NewThreadMessage,
  ThreadMessageResponse,
} from "@/lib/repositories/types/thread.message.types";
import { ThreadMessageService } from "@/lib/services";
import { getSessionFromCookies } from "@/lib/auth/session";

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
  const session = await getSessionFromCookies();
  return await ThreadMessageService.getMessagesByThreadId(
    threadId,
    session?.id,
  );
}

export async function updateMessageContentAction(
  messageId: string,
  content: NewThreadMessage["content"],
) {
  return await ThreadMessageService.updateMessageContent(messageId, content);
}
