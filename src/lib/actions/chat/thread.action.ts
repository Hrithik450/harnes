"use server";

import { ThreadService } from "@/lib/services";
import {
  NewThread,
  ThreadResponse,
} from "@/lib/repositories/types/thread.types";
import { getSessionFromCookies } from "@/lib/auth/session";

export async function createThreadAction(
  data: NewThread,
  userMessage?: string,
): Promise<ThreadResponse> {
  const session = await getSessionFromCookies();
  if (session && !data.user_id) {
    data.user_id = session.id;
  }

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
  const session = await getSessionFromCookies();
  return await ThreadService.getThreads(session?.id);
}
