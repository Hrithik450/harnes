import { ThreadRecord, NewThreadInput } from "../../drizzle/schema";

export type Thread = ThreadRecord;
export type NewThread = NewThreadInput;

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
