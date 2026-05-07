import { and, desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  feedImpressions,
  liveReminders,
  liveSessionListings,
  liveSessionMediaAssets,
  liveSessionParticipants,
  liveSessions,
} from "../../src/db/schema/sessions";
import { offers, negotiationEvents } from "../../src/db/schema/negotiation";
import { LiveSessionStatus } from "../../src/db/schema";

export class SessionsRepository extends BaseRepository {
  async getFeed(limit = 20) {
    return this.database
      .select()
      .from(liveSessions)
      .orderBy(desc(liveSessions.scheduled_start_at))
      .limit(limit);
  }

  async getSessionById(sessionId: string) {
    const [session, featuredListings, participants, mediaAssets] =
      await Promise.all([
        this.database.select().from(liveSessions).where(eq(liveSessions.id, sessionId)),
        this.database
          .select()
          .from(liveSessionListings)
          .where(eq(liveSessionListings.session_id, sessionId)),
        this.database
          .select()
          .from(liveSessionParticipants)
          .where(eq(liveSessionParticipants.session_id, sessionId)),
        this.database
          .select()
          .from(liveSessionMediaAssets)
          .where(eq(liveSessionMediaAssets.session_id, sessionId)),
      ]);

    if (session.length === 0) {
      return null;
    }

    return {
      ...session[0],
      featured_listings: featuredListings,
      participants,
      media_assets: mediaAssets,
    };
  }

  async createSession(input: typeof liveSessions.$inferInsert) {
    const [session] = await this.database
      .insert(liveSessions)
      .values(input)
      .returning();

    return session;
  }

  async startSession(sessionId: string) {
    const [session] = await this.database
      .update(liveSessions)
      .set({
        status: LiveSessionStatus.LIVE,
        actual_start_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(liveSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async endSession(sessionId: string) {
    const [session] = await this.database
      .update(liveSessions)
      .set({
        status: LiveSessionStatus.ENDED,
        actual_end_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(liveSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  async joinSession(input: typeof liveSessionParticipants.$inferInsert) {
    const existing = await this.database
      .select()
      .from(liveSessionParticipants)
      .where(
        and(
          eq(liveSessionParticipants.session_id, input.session_id),
          eq(liveSessionParticipants.user_id, input.user_id),
        ),
      );

    if (existing.length === 0) {
      const [participant] = await this.database
        .insert(liveSessionParticipants)
        .values(input)
        .returning();

      return participant;
    }

    const [participant] = await this.database
      .update(liveSessionParticipants)
      .set({
        role: input.role,
        join_source: input.join_source,
        is_active: true,
        left_at: null,
      })
      .where(eq(liveSessionParticipants.id, existing[0].id))
      .returning();

    return participant;
  }

  async addSessionListing(input: typeof liveSessionListings.$inferInsert) {
    const [sessionListing] = await this.database
      .insert(liveSessionListings)
      .values(input)
      .returning();

    return sessionListing;
  }

  async addMediaAsset(input: typeof liveSessionMediaAssets.$inferInsert) {
    const [asset] = await this.database
      .insert(liveSessionMediaAssets)
      .values(input)
      .returning();

    return asset;
  }

  async createReminder(input: typeof liveReminders.$inferInsert) {
    const [reminder] = await this.database
      .insert(liveReminders)
      .values(input)
      .returning();

    return reminder;
  }

  async trackImpression(input: typeof feedImpressions.$inferInsert) {
    const [impression] = await this.database
      .insert(feedImpressions)
      .values(input)
      .returning();

    return impression;
  }

  async getSessionHistory(sessionId: string) {
    const [sessionOffers, sessionEvents] = await Promise.all([
      this.database
        .select()
        .from(offers)
        .where(eq(offers.session_id, sessionId))
        .orderBy(offers.sequence_no),
      this.database
        .select()
        .from(negotiationEvents)
        .where(eq(negotiationEvents.session_id, sessionId))
        .orderBy(desc(negotiationEvents.created_at)),
    ]);

    return {
      offers: sessionOffers,
      events: sessionEvents,
    };
  }
}
