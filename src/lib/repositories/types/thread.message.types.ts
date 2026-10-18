import { ThreadMessageRecord, NewThreadMessageInput } from "../../drizzle/schema";

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

export type ThreadMessage = ThreadMessageRecord;
export type NewThreadMessage = NewThreadMessageInput;
