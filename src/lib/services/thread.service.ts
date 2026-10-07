import { generateText } from "ai";
import { googleProvider } from "@/lib/gemini/custom-google-provider";
import { ThreadRepository } from "@/lib/repositories/thread.repository";
import {
  ThreadResponse,
  ThreadsResponse,
  NewThread,
} from "../repositories/types/thread.types";

export class ThreadService {
  static async createTitle(userMessage: string): Promise<string> {
    try {
      const result = await generateText({
        model: googleProvider("gemini-3.5-flash-lite"),
        system: "Generate a very short, concise title (max 4-5 words) for a conversation that starts with the following message. Respond ONLY with the title itself, no quotes, no extra text.",
        prompt: userMessage,
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

  static async getThreads(): Promise<ThreadsResponse> {
    try {
      const threads = await ThreadRepository.getThreads();
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
