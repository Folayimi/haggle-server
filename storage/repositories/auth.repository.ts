import { and, desc, eq, isNull } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  authIdentities,
  authOtps,
  userSessions,
  users,
  type InsertAuthIdentity,
  type InsertAuthOtp,
  type InsertUserSession,
} from "../../src/db/schema/auth";
import {
  userProfiles,
  userSettings,
  type InsertUserProfile,
} from "../../src/db/schema/users";
import { AuthProvider, UserPrimaryRole, UserStatus } from "../../src/db/schema";

export interface CreateUserAccountInput {
  full_name: string;
  username: string;
  primary_role?: (typeof UserPrimaryRole)[keyof typeof UserPrimaryRole];
  status?: (typeof UserStatus)[keyof typeof UserStatus];
  email?: string;
  phone_e164?: string;
  password_hash?: string;
  provider?: (typeof AuthProvider)[keyof typeof AuthProvider];
  provider_uid?: string;
  avatar_url?: string;
  bio?: string;
  country_code?: string;
  city?: string;
  response_time_label?: string;
}

export class AuthRepository extends BaseRepository {
  async createUserAccount(input: CreateUserAccountInput) {
    const [user] = await this.database
      .insert(users)
      .values({
        primary_role: input.primary_role ?? UserPrimaryRole.BUYER,
        status: input.status ?? UserStatus.ACTIVE,
      })
      .returning();

    const profileValues: InsertUserProfile = {
      user_id: user.id,
      full_name: input.full_name,
      username: input.username,
      avatar_url: input.avatar_url,
      bio: input.bio,
      country_code: input.country_code,
      city: input.city,
      response_time_label: input.response_time_label,
    };

    await this.database.insert(userProfiles).values(profileValues);
    await this.database.insert(userSettings).values({ user_id: user.id });

    if (input.email || input.phone_e164) {
      const identityValues: InsertAuthIdentity = {
        user_id: user.id,
        provider:
          input.provider ??
          (input.email ? AuthProvider.EMAIL : AuthProvider.PHONE),
        provider_uid:
          input.provider_uid ?? input.email ?? input.phone_e164 ?? user.id,
        email: input.email,
        phone_e164: input.phone_e164,
        password_hash: input.password_hash,
        is_primary: true,
      };

      await this.database.insert(authIdentities).values(identityValues);
    }

    return this.getUserAccountById(user.id);
  }

  async getUserAccountById(userId: string) {
    const [user, profile, settings, identities] = await Promise.all([
      this.database.select().from(users).where(eq(users.id, userId)),
      this.database
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.user_id, userId)),
      this.database
        .select()
        .from(userSettings)
        .where(eq(userSettings.user_id, userId)),
      this.database
        .select()
        .from(authIdentities)
        .where(eq(authIdentities.user_id, userId)),
    ]);

    if (user.length === 0) {
      return null;
    }

    return {
      ...user[0],
      profile: profile[0] ?? null,
      settings: settings[0] ?? null,
      identities,
    };
  }

  async findIdentityByEmail(email: string) {
    const result = await this.database
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, email));

    return result[0] ?? null;
  }

  async findPrimaryIdentityByUserId(userId: string) {
    const result = await this.database
      .select()
      .from(authIdentities)
      .where(
        and(
          eq(authIdentities.user_id, userId),
          eq(authIdentities.is_primary, true),
        ),
      );

    return result[0] ?? null;
  }

  async createOtp(input: InsertAuthOtp) {
    const [otp] = await this.database
      .insert(authOtps)
      .values(input)
      .returning();
    return otp;
  }

  async consumeOtp(otpId: string) {
    const [otp] = await this.database
      .update(authOtps)
      .set({ consumed_at: new Date() })
      .where(and(eq(authOtps.id, otpId), isNull(authOtps.consumed_at)))
      .returning();

    return otp ?? null;
  }

  async createUserSession(input: InsertUserSession) {
    const [session] = await this.database
      .insert(userSessions)
      .values(input)
      .returning();

    return session;
  }

  async listUserSessions(userId: string) {
    return this.database
      .select()
      .from(userSessions)
      .where(eq(userSessions.user_id, userId))
      .orderBy(desc(userSessions.created_at));
  }

  async revokeUserSession(sessionId: string) {
    const [session] = await this.database
      .update(userSessions)
      .set({ revoked_at: new Date() })
      .where(eq(userSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async checkPhoneOrEmailExists(
    email?: string,
    phone_e164?: string,
  ): Promise<String | null> {
    if (!email && !phone_e164) {
      return null;
    }

    console.log("checking.....");

    const emailquery = this.database.select().from(authIdentities);

    if (email) {
      emailquery.where(eq(authIdentities.email, email));
    }

    const phonequery = this.database.select().from(authIdentities);

    if (phone_e164) {
      phonequery.where(eq(authIdentities.phone_e164, phone_e164));
    }

    const phone_existing = await phonequery;
    const email_existing = await emailquery;

    if (phone_existing.length > 0) {
      return "Account with this device already exists";
    } else if (email_existing.length > 0) {
      return "Account with this email already exists";
    }
    return null;
  }
}
