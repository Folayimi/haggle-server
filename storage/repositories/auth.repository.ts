import { and, count, desc, eq, gt, isNull, lte } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  authIdentities,
  authOtps,
  emailVerifications,
  resetEmailVerifications,
  userSessions,
  users,
  type InsertAuthIdentity,
  type InsertAuthOtp,
  type InsertEmailVerification,
  type InsertUserSession,
} from "../../src/db/schema/auth";
import {
  authSessions,
  type InsertAuthSession,
} from "../../src/db/schema/auth-sessions";
import {
  userProfiles,
  userSettings,
  type InsertUserProfile,
} from "../../src/db/schema/users";
import {
  AuthProvider,
  EmailVerificationType,
  UserPrimaryRole,
  UserStatus,
} from "../../src/db/schema";
import { error } from "node:console";
import {
  EMAIL_VERIFICATION_EXPIRY_MINUTES,
  generateSixDigitOtp,
  generateVerificationJwt,
  getRateLimitWindowMs,
  getVerificationExpiryDate,
} from "../../services/emailVerification";
import { sendAppOtpEmail } from "../../services/email";

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

  async findPrimaryEmailIdentityByEmail(email: string) {
    const result = await this.database
      .select()
      .from(authIdentities)
      .where(
        and(
          eq(authIdentities.email, email),
          eq(authIdentities.provider, AuthProvider.EMAIL),
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

  async findUserByEmail(email?: string) {
    if (!email) {
      return null;
    }

    const [user] = await this.database
      .select()
      .from(authIdentities)
      .where(eq(authIdentities.email, email));

    return user ?? null;
  }

  async findUserById(userId: string) {
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.id, userId));
    return user ?? null;
  }

  async sendVerificationOTP(
    email: string,
    maxVerificationRequest: number,
    res: any,
  ) {
    try {
      const identity = await this.findPrimaryEmailIdentityByEmail(email);

      if (!identity) {
        throw error("No account found for this email");
      }

      if (identity.verified_at) {
        throw error("Email is already verified");
      }

      const rateLimitWindowMs = getRateLimitWindowMs();
      const windowStart = new Date(Date.now() - rateLimitWindowMs);
      const recentRequests = await this.countRecentEmailVerificationRequests(
        email,
        windowStart,
        "account",
      );

      if (recentRequests >= maxVerificationRequest) {
        throw error("Too many verification requests. Please try again later.");
      }

      const expiresAt = getVerificationExpiryDate();
      const verificationRecord = await this.createEmailVerification({
        email,
        expires_at: expiresAt,
        otp_code: generateSixDigitOtp(),
        type: EmailVerificationType.APP_OTP,
        user_id: identity.user_id,
      });

      try {
        const supportEmail = process.env.EMAIL_USER ?? "";

        await sendAppOtpEmail({
          email,
          expiresInMinutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
          otpCode: verificationRecord.otp_code ?? "",
          supportEmail,
        });
      } catch (emailError) {
        await this.deleteEmailVerification(verificationRecord.id);
        console.error("Failed to send verification email", {
          email,
          error: emailError,
        });
        return res.status(500).json({ error: "Failed to create user account" });
      }
    } catch (err) {
      console.error("Send verification error", { email, err });
      return res.status(500).json({ error: "Send verification error" });
    }
  }

  async checkPhoneOrEmailExists(
    email?: string,
    // phone_e164?: string,
  ): Promise<String | null> {
    if (!email) {
      return null;
    }

    console.log("checking.....");

    const emailquery = this.database.select().from(authIdentities);

    if (email) {
      emailquery.where(eq(authIdentities.email, email));
    }

    // const phonequery = this.database.select().from(authIdentities);

    // if (phone_e164) {
    //   phonequery.where(eq(authIdentities.phone_e164, phone_e164));
    // }

    // const phone_existing = await phonequery;
    const email_existing = await emailquery;

    // if (phone_existing.length > 0) {
    //   return "Account with this device already exists";
    // } else

    if (email_existing.length > 0) {
      return "Account with this email already exists";
    }
    return null;
  }

  async countRecentEmailVerificationRequests(
    email: string,
    since: Date,
    type: string,
  ) {
    if (type === "account") {
      const [result] = await this.database
        .select({ count: count() })
        .from(emailVerifications)
        .where(
          and(
            eq(emailVerifications.email, email),
            gt(emailVerifications.created_at, since),
          ),
        );

      return result?.count ?? 0;
    } else if (type === "reset") {
      const [result] = await this.database
        .select({ count: count() })
        .from(resetEmailVerifications)
        .where(
          and(
            eq(resetEmailVerifications.email, email),
            gt(resetEmailVerifications.created_at, since),
          ),
        );

      return result?.count ?? 0;
    } else {
      return 0;
    }
  }

  async createEmailVerification(input: InsertEmailVerification) {
    const [verification] = await this.database
      .insert(emailVerifications)
      .values(input)
      .returning();

    return verification;
  }

  async createResetEmailVerification(input: InsertEmailVerification) {
    const [verification] = await this.database
      .insert(resetEmailVerifications)
      .values(input)
      .returning();

    return verification;
  }

  async deleteEmailVerification(id: string) {
    const [verification] = await this.database
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, id))
      .returning();

    return verification ?? null;
  }

  async deleteResetEmailVerification(id: string) {
    const [verification] = await this.database
      .delete(resetEmailVerifications)
      .where(eq(resetEmailVerifications.id, id))
      .returning();

    return verification ?? null;
  }

  async findActiveWebVerificationByToken(token: string) {
    const result = await this.database
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.token, token),
          eq(emailVerifications.type, EmailVerificationType.WEB_LINK),
          isNull(emailVerifications.verified_at),
        ),
      );

    return result[0] ?? null;
  }

  async findActiveOtpVerification(email: string, otpCode: string) {
    const result = await this.database
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.otp_code, otpCode),
          eq(emailVerifications.type, EmailVerificationType.APP_OTP),
          isNull(emailVerifications.verified_at),
        ),
      );

    return result[0] ?? null;
  }

  async findActiveResetOtpVerification(email: string, otpCode: string) {
    const result = await this.database
      .select()
      .from(resetEmailVerifications)
      .where(
        and(
          eq(resetEmailVerifications.email, email),
          eq(resetEmailVerifications.otp_code, otpCode),
          eq(resetEmailVerifications.type, EmailVerificationType.APP_OTP),
          isNull(resetEmailVerifications.verified_at),
        ),
      );

    return result[0] ?? null;
  }

  async markEmailVerificationVerified(id: string) {
    const [verification] = await this.database
      .update(emailVerifications)
      .set({ verified_at: new Date() })
      .where(
        and(
          eq(emailVerifications.id, id),
          isNull(emailVerifications.verified_at),
        ),
      )
      .returning();

    return verification ?? null;
  }

  async markResetEmailVerificationVerified(id: string) {
    const [verification] = await this.database
      .update(resetEmailVerifications)
      .set({ verified_at: new Date() })
      .where(
        and(
          eq(resetEmailVerifications.id, id),
          isNull(resetEmailVerifications.verified_at),
        ),
      )
      .returning();

    return verification ?? null;
  }

  async markEmailIdentityVerified(userId: string, email: string) {
    const [identity] = await this.database
      .update(authIdentities)
      .set({ verified_at: new Date() })
      .where(
        and(
          eq(authIdentities.user_id, userId),
          eq(authIdentities.email, email),
          eq(authIdentities.provider, AuthProvider.EMAIL),
        ),
      )
      .returning();

    return identity ?? null;
  }

  async deleteExpiredEmailVerifications(now: Date) {
    return this.database
      .delete(emailVerifications)
      .where(
        and(
          lte(emailVerifications.expires_at, now),
          isNull(emailVerifications.verified_at),
        ),
      )
      .returning();
  }
}
