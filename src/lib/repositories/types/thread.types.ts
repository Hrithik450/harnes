import { threads } from "../../drizzle/schema";

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

export type ThreadResponse = {
  success: boolean;
  data?: Thread;
  error?: string;
};

export type ThreadsResponse = {
  success: boolean;
  data?: Thread[];
  error?: string;
};
