import { threadMessages } from "../../drizzle/schema";

export type ThreadMessageResponse = {
  success: boolean;
  data?: ThreadMessage;
  error?: string;
};

export type ThreadMessagesResponse = {
  success: boolean;
  data?: ThreadMessage[];
  error?: string;
};

export type ThreadMessage = typeof threadMessages.$inferSelect;
export type NewThreadMessage = typeof threadMessages.$inferInsert;
