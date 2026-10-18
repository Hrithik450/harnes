import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/drizzle/schema";
import { User, NewUser } from "./types/user.types";

export class UserRepository {
  static async findById(id: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user;
  }

  static async findByGoogleId(googleId: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.google_id, googleId),
    });
    return user;
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });
    return user;
  }

  static async createUser(data: NewUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        ...data,
        email: data.email.toLowerCase().trim(),
      })
      .returning();
    return newUser;
  }

  static async updateUser(
    id: string,
    data: Partial<NewUser>,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }
}
