import { and, desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { users } from "../../src/db/schema/auth";
import {
  sellerProfiles,
  userAddresses,
  userProfiles,
  userSettings,
} from "../../src/db/schema/users";
import { reviews } from "../../src/db/schema/trust";
import { sellerFollows } from "../../src/db/schema/sessions";
import { UserPrimaryRole, UserStatus } from "../../src/db/schema";

export interface UpdateCurrentUserInput {
  primary_role?: (typeof UserPrimaryRole)[keyof typeof UserPrimaryRole];
  status?: (typeof UserStatus)[keyof typeof UserStatus];
  full_name?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  country_code?: string;
  city?: string;
  response_time_label?: string;
  push_enabled?: boolean;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  show_online_status?: boolean;
  preferred_currency?: string;
  preferred_role?: string;
  seller_preferences?: unknown;
  business_name?: string;
  trade_mark?: string;
  cover_image_url?: string;
  sells_summary?: string;
}

export interface CreateAddressInput {
  user_id: string;
  label: string;
  recipient_name: string;
  phone_e164: string;
  country: string;
  state: string;
  city: string;
  line_1: string;
  line_2?: string;
  postal_code: string;
  is_default?: boolean;
}

export class UsersRepository extends BaseRepository {
  async getUserById(userId: string) {
    const [user, profile, settings, sellerProfile] = await Promise.all([
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
        .from(sellerProfiles)
        .where(eq(sellerProfiles.user_id, userId)),
    ]);

    if (user.length === 0) {
      return null;
    }

    return {
      ...user[0],
      profile: profile[0] ?? null,
      settings: settings[0] ?? null,
      seller_profile: sellerProfile[0] ?? null,
    };
  }

  async updateCurrentUser(userId: string, input: UpdateCurrentUserInput) {
    const userValues = this.pickDefined({
      primary_role: input.primary_role,
      status: input.status,
      updated_at: new Date(),
    });

    if (Object.keys(userValues).length > 1) {
      await this.database
        .update(users)
        .set(userValues)
        .where(eq(users.id, userId));
    }

    const profileValues = this.pickDefined({
      full_name: input.full_name,
      username: input.username,
      avatar_url: input.avatar_url,
      bio: input.bio,
      country_code: input.country_code,
      city: input.city,
      response_time_label: input.response_time_label,
      updated_at: new Date(),
    });

    if (Object.keys(profileValues).length > 1) {
      const existingProfile = await this.database
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.user_id, userId));

      if (existingProfile.length === 0) {
        await this.database.insert(userProfiles).values({
          user_id: userId,
          full_name: input.full_name ?? "New User",
          username: input.username ?? `user_${userId.slice(0, 8)}`,
          avatar_url: input.avatar_url,
          bio: input.bio,
          country_code: input.country_code,
          city: input.city,
          response_time_label: input.response_time_label,
        });
      } else {
        await this.database
          .update(userProfiles)
          .set(profileValues)
          .where(eq(userProfiles.user_id, userId));
      }
    }

    const settingsValues = this.pickDefined({
      push_enabled: input.push_enabled,
      sms_enabled: input.sms_enabled,
      email_enabled: input.email_enabled,
      show_online_status: input.show_online_status,
      preferred_currency: input.preferred_currency,
      preferred_role: input.preferred_role,
      seller_preferences: input.seller_preferences,
      updated_at: new Date(),
    });

    if (Object.keys(settingsValues).length > 1) {
      const existingSettings = await this.database
        .select()
        .from(userSettings)
        .where(eq(userSettings.user_id, userId));

      if (existingSettings.length === 0) {
        await this.database.insert(userSettings).values({
          user_id: userId,
          push_enabled: input.push_enabled ?? true,
          sms_enabled: input.sms_enabled ?? true,
          email_enabled: input.email_enabled ?? true,
          show_online_status: input.show_online_status ?? true,
          preferred_currency: input.preferred_currency ?? "USD",
          preferred_role: input.preferred_role ?? "buyer",
          seller_preferences: input.seller_preferences,
        });
      } else {
        await this.database
          .update(userSettings)
          .set(settingsValues)
          .where(eq(userSettings.user_id, userId));
      }
    }

    const sellerValues = this.pickDefined({
      business_name: input.business_name,
      trade_mark: input.trade_mark,
      cover_image_url: input.cover_image_url,
      sells_summary: input.sells_summary,
      updated_at: new Date(),
    });

    if (Object.keys(sellerValues).length > 1) {
      const existingSeller = await this.database
        .select()
        .from(sellerProfiles)
        .where(eq(sellerProfiles.user_id, userId));

      if (existingSeller.length === 0) {
        await this.database.insert(sellerProfiles).values({
          user_id: userId,
          business_name: input.business_name ?? "New Seller",
          trade_mark: input.trade_mark,
          cover_image_url: input.cover_image_url,
          sells_summary: input.sells_summary,
        });
      } else {
        await this.database
          .update(sellerProfiles)
          .set(sellerValues)
          .where(eq(sellerProfiles.user_id, userId));
      }
    }

    return this.getUserById(userId);
  }

  async getUserRatings(userId: string) {
    return this.database
      .select()
      .from(reviews)
      .where(eq(reviews.reviewed_user_id, userId))
      .orderBy(desc(reviews.created_at));
  }

  async followSeller(sellerId: string, followerId: string) {
    const existing = await this.database
      .select()
      .from(sellerFollows)
      .where(
        and(
          eq(sellerFollows.seller_id, sellerId),
          eq(sellerFollows.user_id, followerId),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [follow] = await this.database
      .insert(sellerFollows)
      .values({ seller_id: sellerId, user_id: followerId })
      .returning();

    return follow;
  }

  async unfollowSeller(sellerId: string, followerId: string) {
    const deleted = await this.database
      .delete(sellerFollows)
      .where(
        and(
          eq(sellerFollows.seller_id, sellerId),
          eq(sellerFollows.user_id, followerId),
        ),
      )
      .returning();

    return deleted.length > 0;
  }

  async listFollowers(sellerId: string) {
    return this.database
      .select()
      .from(sellerFollows)
      .where(eq(sellerFollows.seller_id, sellerId))
      .orderBy(desc(sellerFollows.created_at));
  }

  async createAddress(input: CreateAddressInput) {
    const [address] = await this.database
      .insert(userAddresses)
      .values(input)
      .returning();

    return address;
  }

  async listAddresses(userId: string) {
    return this.database
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.user_id, userId))
      .orderBy(desc(userAddresses.created_at));
  }
}
