import { UserRecord, NewUserInput } from "../../drizzle/schema";

export type User = UserRecord;
export type NewUser = NewUserInput;

export type UserResponse = {
  success: boolean;
  data?: User;
  error?: string;
};
