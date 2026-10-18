import { UserRepository } from "@/lib/repositories/user.repository";
import type { User } from "@/lib/repositories/types/user.types";

export class UserService {
  /**
   * Finds an existing user by Google ID or email, or creates a new user record.
   * Matches the robust pattern from NeylonAI.
   */
  static async findOrCreateGoogleUser(data: {
    google_id: string;
    email: string;
    name: string;
    picture: string;
  }): Promise<{ user: User; created: boolean }> {
    // 1. Try finding by Google ID
    const existing = await UserRepository.findByGoogleId(data.google_id);

    if (existing) {
      const updated = await UserRepository.updateUser(existing.id, {
        name: data.name.trim() || existing.name,
        picture: data.picture || existing.picture,
      });
      return { user: updated ?? existing, created: false };
    }

    // 2. Try finding by Email (e.g. previously linked or invited)
    const existingByEmail = await UserRepository.findByEmail(data.email);
    if (existingByEmail) {
      const updated = await UserRepository.updateUser(existingByEmail.id, {
        google_id: data.google_id,
        name: data.name.trim() || existingByEmail.name,
        picture: data.picture || existingByEmail.picture,
      });
      return { user: updated ?? existingByEmail, created: false };
    }

    // 3. Create brand new user
    const newUser = await UserRepository.createUser({
      google_id: data.google_id,
      name: data.name.trim() || data.email.split("@")[0],
      email: data.email,
      picture: data.picture,
      role: "user",
    });

    return { user: newUser, created: true };
  }

  static async getUserById(id: string): Promise<User | undefined> {
    return UserRepository.findById(id);
  }
}
