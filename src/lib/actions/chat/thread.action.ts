"use server";

import { ThreadService } from "@/lib/services/thread.service";
import {
  NewThread,
  ThreadResponse,
} from "@/lib/repositories/types/thread.types";

export async function createThreadAction(
  data: NewThread,
  userMessage?: string,
): Promise<ThreadResponse> {
  if (userMessage) {
    data.title = await ThreadService.createTitle(userMessage);
  }

  const result = await ThreadService.createThread(data);

  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

export async function getThreadsAction() {
  return await ThreadService.getThreads();
}
