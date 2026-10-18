import { generateText } from "ai";
import { getTitleModel } from "@/lib/providers";
import {
  ThreadRepository,
  DEFAULT_AGENT_THREADS,
} from "@/lib/repositories/thread.repository";
import {
  ThreadResponse,
  ThreadsResponse,
  NewThread,
} from "@/lib/repositories/types/thread.types";

export class ThreadService {
  static async createTitle(userMessage: string): Promise<string> {
    try {
      const result = await generateText({
        model: getTitleModel(),
        system:
          "Generate a very short, concise title (max 4-5 words) for a conversation that starts with the following message. Respond ONLY with the title itself, no quotes, no extra text.",
        prompt: userMessage,
        abortSignal: AbortSignal.timeout(4000),
      });
      return result.text.trim();
    } catch (error) {
      console.error("Failed to generate title:", error);
      return "New Chat";
    }
  }

  static async createThread(data: NewThread): Promise<ThreadResponse> {
    try {
      const thread = await ThreadRepository.createThread(data);
      return {
        success: true,
        data: thread,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create thread",
      };
    }
  }

  /**
   * Provisions default agent threads for a specific user via createThread in Promise.all.
   * IDs and timestamps are generated strictly at the database level.
   */
  static async createDefaultThreadsForUser(userId: string): Promise<void> {
    try {
      const existing = await ThreadRepository.getDefaultThreadsByUserId(userId);
      const existingTitles = new Set(existing.map((t) => t.title));

      const toCreate = DEFAULT_AGENT_THREADS.filter(
        (def) => !existingTitles.has(def.title),
      );

      if (toCreate.length > 0) {
        await Promise.all(
          toCreate.map((def) =>
            this.createThread({
              user_id: userId,
              title: def.title,
              is_default: true,
              order_index: def.order_index,
            }),
          ),
        );
      }
    } catch (error) {
      console.error(
        "[ThreadService] Failed to create default threads for user:",
        error,
      );
    }
  }

  static async getThreads(userId?: string): Promise<ThreadsResponse> {
    try {
      if (userId) {
        await this.createDefaultThreadsForUser(userId);
      }
      const threads = await ThreadRepository.getThreads(userId);
      return {
        success: true,
        data: threads,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get threads",
      };
    }
  }

  static async getThreadById(id: string): Promise<ThreadResponse> {
    try {
      const thread = await ThreadRepository.getThreadById(id);
      if (!thread) {
        return {
          success: false,
          error: "Thread not found",
        };
      }
      return {
        success: true,
        data: thread,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get thread",
      };
    }
  }

  static async updateThreadTitle(
    id: string,
    title: string,
  ): Promise<ThreadResponse> {
    try {
      const updatedThread = await ThreadRepository.updateThreadTitle(id, title);
      if (!updatedThread) {
        return {
          success: false,
          error: "Thread not found",
        };
      }
      return {
        success: true,
        data: updatedThread,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update thread",
      };
    }
  }

  static async deleteThread(
    id: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deletedThread = await ThreadRepository.deleteThread(id);
      if (!deletedThread) {
        return {
          success: false,
          error: "Thread not found",
        };
      }
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete thread",
      };
    }
  }
}
