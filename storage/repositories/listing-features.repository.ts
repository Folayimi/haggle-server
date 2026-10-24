import { and, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { BaseRepository } from "./base.repository";
import { listings } from "../../src/db/schema/catalog";
import { feedImpressions, savedListings, sellerFollows } from "../../src/db/schema/sessions";
import { listingReviews } from "../../src/db/schema/trust";
import { orderItems, orders } from "../../src/db/schema/commerce";
import { userProfiles } from "../../src/db/schema/users";
import { getViewDedupeBucket, TRENDING_WEIGHTS } from "../../utils/listing-discovery";

const ACTIVE = "published";
const publicListing = (conditions: any[] = []) => and(eq(listings.status, ACTIVE), ...conditions);

export class ListingFeaturesRepository extends BaseRepository {
  async getPublicListing(id: string) {
    const [row] = await this.database.select().from(listings).where(and(eq(listings.id, id), eq(listings.status, ACTIVE))).limit(1);
    return row ?? null;
  }

  async recordView(listingId: string, userId: string) {
    const listing = await this.getPublicListing(listingId);
    if (!listing || listing.seller_id === userId) return { counted: false, listing, viewCount: listing?.view_count ?? null };
    const bucket = getViewDedupeBucket(Date.now());
    const dedupeKey = `view:${userId}:${listingId}:${bucket}`;
    const [inserted] = await this.database.insert(feedImpressions).values({
      user_id: userId, listing_id: listingId, impression_type: "view", dedupe_key: dedupeKey,
    }).onConflictDoNothing({ target: feedImpressions.dedupe_key }).returning({ id: feedImpressions.id });
    let viewCount = listing.view_count;
    if (inserted) {
      const [updated] = await this.database.update(listings).set({ view_count: sql`${listings.view_count} + 1` }).where(eq(listings.id, listingId)).returning({ view_count: listings.view_count });
      viewCount = updated?.view_count ?? viewCount + 1;
    }
    return { counted: !!inserted, listing, viewCount };
  }

  async recordInteraction(input: { listingId: string; userId: string; type: string; eventId?: string; watchMs?: number }) {
    const listing = await this.getPublicListing(input.listingId);
    if (!listing) return null;
    if (listing.seller_id === input.userId) return { recorded: false };
    const key = input.eventId ? `client:${input.userId}:${input.eventId}` : undefined;
    const [inserted] = await this.database.insert(feedImpressions).values({
      user_id: input.userId,
      listing_id: input.listingId,
      impression_type: input.type as any,
      watch_ms: input.watchMs,
      dedupe_key: key,
    }).onConflictDoNothing({ target: feedImpressions.dedupe_key }).returning({ id: feedImpressions.id });
    if (inserted && input.type === "share") {
      await this.database.update(listings).set({ share_count: sql`${listings.share_count} + 1` }).where(eq(listings.id, input.listingId));
    }
    return { recorded: !!inserted };
  }

  async listFeed(input: { kind: "latest" | "trending"; limit: number; offset: number; type?: string; categoryId?: string; userId?: string }) {
    const conditions: any[] = [];
    if (input.type) conditions.push(eq(listings.listing_type, input.type as any));
    if (input.categoryId) conditions.push(eq(listings.category_id, input.categoryId));
    const filters = publicListing(conditions);
    const ratings = this.database.select({
      listing_id: listingReviews.listing_id,
      average: sql<number>`round(avg(${listingReviews.rating})::numeric, 2)::float`.as("average"),
      count: sql<number>`count(*)::int`.as("count"),
    }).from(listingReviews).where(and(eq(listingReviews.status, "published"), isNull(listingReviews.deleted_at))).groupBy(listingReviews.listing_id).as("ratings");
    if (input.kind === "latest") {
      const rows = await this.database.select({ listing: listings, seller: { full_name: userProfiles.full_name, avatar_url: userProfiles.avatar_url }, rating_summary: { average: ratings.average, count: ratings.count } })
        .from(listings).leftJoin(userProfiles, eq(userProfiles.user_id, listings.seller_id)).leftJoin(ratings, eq(ratings.listing_id, listings.id))
        .where(filters).orderBy(desc(listings.created_at), desc(listings.id)).limit(input.limit).offset(input.offset);
      return rows.map(({ listing, ...extra }) => ({ ...listing, ...extra }));
    }
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eventListings = alias(listings, "event_listing");
    const engagement = this.database.select({
      listing_id: feedImpressions.listing_id,
      score: sql<number>`${TRENDING_WEIGHTS.view} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'view')
        + ${TRENDING_WEIGHTS.tap} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'tap')
        + ${TRENDING_WEIGHTS.save} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'save')
        + ${TRENDING_WEIGHTS.share} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'share')
        + ${TRENDING_WEIGHTS.watch} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'watch' and ${feedImpressions.watch_ms} >= 5000)
        + ${TRENDING_WEIGHTS.contact_seller} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'contact_seller')
        + ${TRENDING_WEIGHTS.negotiation_started} * count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'negotiation_started')`.as("score"),
    }).from(feedImpressions).innerJoin(eventListings, eq(eventListings.id, feedImpressions.listing_id))
      .where(and(gte(feedImpressions.created_at, since), ne(feedImpressions.user_id, eventListings.seller_id))).groupBy(feedImpressions.listing_id).as("engagement");
    const score = sql<number>`coalesce(${engagement.score}, 0) * greatest(0.1, 1 - extract(epoch from (now() - ${listings.created_at})) / 1209600.0)`;
    const rows = await this.database.select({ listing: listings, seller: { full_name: userProfiles.full_name, avatar_url: userProfiles.avatar_url }, rating_summary: { average: ratings.average, count: ratings.count }, trending_score: score })
      .from(listings).leftJoin(userProfiles, eq(userProfiles.user_id, listings.seller_id))
      .leftJoin(engagement, eq(engagement.listing_id, listings.id)).leftJoin(ratings, eq(ratings.listing_id, listings.id))
      .where(filters).orderBy(desc(score), desc(listings.created_at), desc(listings.id)).limit(input.limit).offset(input.offset);
    return rows.map(({ listing, ...extra }) => ({ ...listing, ...extra }));
  }

  async recommendations(input: { userId: string; limit: number; offset: number; type?: string; categoryId?: string }) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [categorySignals, typeSignals, sellerSignals, savedCategories] = await Promise.all([
      this.database.select({ categoryId: listings.category_id, weight: sql<number>`count(distinct ${feedImpressions.listing_id})`.as("weight") }).from(feedImpressions).innerJoin(listings, eq(feedImpressions.listing_id, listings.id)).where(and(eq(feedImpressions.user_id, input.userId), gte(feedImpressions.created_at, cutoff))).groupBy(listings.category_id).orderBy(desc(sql`count(distinct ${feedImpressions.listing_id})`)).limit(10),
      this.database.select({ type: listings.listing_type, weight: sql<number>`count(*)`.as("weight") }).from(feedImpressions).innerJoin(listings, eq(feedImpressions.listing_id, listings.id)).where(and(eq(feedImpressions.user_id, input.userId), gte(feedImpressions.created_at, cutoff))).groupBy(listings.listing_type),
      this.database.select({ sellerId: sellerFollows.seller_id }).from(sellerFollows).where(eq(sellerFollows.user_id, input.userId)),
      this.database.select({ categoryId: listings.category_id, weight: sql<number>`count(distinct ${savedListings.listing_id})`.as("weight") }).from(savedListings).innerJoin(listings, eq(savedListings.listing_id, listings.id)).where(eq(savedListings.user_id, input.userId)).groupBy(listings.category_id).orderBy(desc(sql`count(distinct ${savedListings.listing_id})`)).limit(10),
    ]);
    const categoryWeights = new Map<string, number>();
    for (const signal of categorySignals) categoryWeights.set(signal.categoryId, Number(signal.weight) * 2);
    for (const signal of savedCategories) categoryWeights.set(signal.categoryId, (categoryWeights.get(signal.categoryId) ?? 0) + Number(signal.weight) * 5);
    const categoryIds = [...categoryWeights.keys()];
    const followedIds = sellerSignals.map((x) => x.sellerId).filter((id) => id !== input.userId);
    const typeWeight = new Map(typeSignals.map((x) => [x.type, Number(x.weight)]));
    if (categoryIds.length === 0 && followedIds.length === 0 && typeSignals.length === 0) {
      const fallback = await this.listFeed({ kind: "trending", limit: input.limit, offset: input.offset, type: input.type, categoryId: input.categoryId, userId: input.userId });
      return fallback.map((x) => ({ ...x, recommendation_reason: "trending" }));
    }
    const conditions: any[] = [ne(listings.seller_id, input.userId)];
    if (input.type) conditions.push(eq(listings.listing_type, input.type as any));
    if (input.categoryId) conditions.push(eq(listings.category_id, input.categoryId));
    if (categoryIds.length || followedIds.length) {
      const personalized: any[] = [];
      if (categoryIds.length) personalized.push(inArray(listings.category_id, categoryIds));
      if (followedIds.length) personalized.push(inArray(listings.seller_id, followedIds));
      conditions.push(or(...personalized));
    }
    const ratings = this.database.select({
      listing_id: listingReviews.listing_id,
      average: sql<number>`round(avg(${listingReviews.rating})::numeric, 2)::float`.as("average"),
      count: sql<number>`count(*)::int`.as("count"),
    }).from(listingReviews).where(and(eq(listingReviews.status, "published"), isNull(listingReviews.deleted_at))).groupBy(listingReviews.listing_id).as("ratings");
    const candidates = await this.database.select({ listing: listings, seller: { full_name: userProfiles.full_name, avatar_url: userProfiles.avatar_url }, rating_summary: { average: ratings.average, count: ratings.count } })
      .from(listings).leftJoin(userProfiles, eq(userProfiles.user_id, listings.seller_id)).leftJoin(ratings, eq(ratings.listing_id, listings.id))
      .where(publicListing(conditions)).orderBy(desc(listings.created_at), desc(listings.id)).limit(300);
    const ranked = candidates.map((candidate) => {
      const catWeight = categoryWeights.get(candidate.listing.category_id) ?? 0;
      const sellerWeight = followedIds.includes(candidate.listing.seller_id) ? 10 : 0;
      const score = Number(catWeight) * 2 + sellerWeight + (typeWeight.get(candidate.listing.listing_type) ?? 0);
      const reason = sellerWeight ? "based_on_followed_seller" : catWeight ? "based_on_category" : "recently_listed";
      return { ...candidate.listing, seller: candidate.seller, rating_summary: candidate.rating_summary, recommendation_reason: reason, recommendation_score: score };
    }).sort((a, b) => b.recommendation_score - a.recommendation_score || b.created_at.getTime() - a.created_at.getTime() || b.id.localeCompare(a.id));
    if (ranked.length === 0) {
      const fallback = await this.listFeed({ kind: "trending", limit: input.limit, offset: input.offset, type: input.type, categoryId: input.categoryId, userId: input.userId });
      return fallback.map((x) => ({ ...x, recommendation_reason: "trending" }));
    }
    return ranked.slice(input.offset, input.offset + input.limit);
  }

  async recordReview(input: { listingId: string; reviewerId: string; rating: number; title?: string; comment?: string }) {
    const [listing] = await this.database.select({ sellerId: listings.seller_id }).from(listings).where(and(eq(listings.id, input.listingId), eq(listings.status, ACTIVE))).limit(1);
    if (!listing) return { kind: "missing" as const };
    if (listing.sellerId === input.reviewerId) return { kind: "self" as const };
    const [verified] = await this.database.select({ id: orderItems.id }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.order_id)).where(and(eq(orderItems.listing_id, input.listingId), eq(orders.buyer_id, input.reviewerId), eq(orders.status, "delivered"))).limit(1);
    const [existing] = await this.database.select().from(listingReviews).where(and(eq(listingReviews.listing_id, input.listingId), eq(listingReviews.reviewer_user_id, input.reviewerId))).limit(1);
    if (existing && existing.deleted_at) {
      const [review] = await this.database.update(listingReviews).set({
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        is_verified_purchase: !!verified,
        status: "published",
        deleted_at: null,
        updated_at: new Date(),
      }).where(eq(listingReviews.id, existing.id)).returning();
      return { kind: "ok" as const, review };
    }
    if (existing) return { kind: "exists" as const };
    const [review] = await this.database.insert(listingReviews).values({
      listing_id: input.listingId,
      reviewer_user_id: input.reviewerId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      is_verified_purchase: !!verified,
    }).returning();
    return { kind: "ok" as const, review };
  }

  async updateReview(input: { listingId: string; reviewId: string; userId: string; rating?: number; title?: string | null; comment?: string | null }) {
    const [review] = await this.database.update(listingReviews).set({ rating: input.rating, title: input.title, comment: input.comment, updated_at: new Date() })
      .where(and(eq(listingReviews.id, input.reviewId), eq(listingReviews.listing_id, input.listingId), eq(listingReviews.reviewer_user_id, input.userId), isNull(listingReviews.deleted_at))).returning();
    return review ?? null;
  }

  async deleteReview(input: { listingId: string; reviewId: string; userId: string }) {
    const [review] = await this.database.update(listingReviews).set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(listingReviews.id, input.reviewId), eq(listingReviews.listing_id, input.listingId), eq(listingReviews.reviewer_user_id, input.userId), isNull(listingReviews.deleted_at))).returning({ id: listingReviews.id });
    return !!review;
  }

  async listReviews(listingId: string, limit: number, offset: number) {
    return this.database.select({ id: listingReviews.id, rating: listingReviews.rating, title: listingReviews.title, comment: listingReviews.comment, is_verified_purchase: listingReviews.is_verified_purchase, created_at: listingReviews.created_at, reviewer: { full_name: userProfiles.full_name, avatar_url: userProfiles.avatar_url } })
      .from(listingReviews).leftJoin(userProfiles, eq(userProfiles.user_id, listingReviews.reviewer_user_id))
      .where(and(eq(listingReviews.listing_id, listingId), eq(listingReviews.status, "published"), isNull(listingReviews.deleted_at)))
      .orderBy(desc(listingReviews.created_at), desc(listingReviews.id)).limit(limit).offset(offset);
  }

  async reviewSummary(listingId: string) {
    const [summary] = await this.database.select({ count: sql<number>`count(*)::int`, average: sql<number>`coalesce(round(avg(${listingReviews.rating})::numeric, 2), 0)::float` })
      .from(listingReviews).where(and(eq(listingReviews.listing_id, listingId), eq(listingReviews.status, "published"), isNull(listingReviews.deleted_at)));
    return { count: Number(summary.count), average: Number(summary.average) };
  }

  async ownReviews(userId: string, limit: number, offset: number) {
    return this.database.select({ review: listingReviews, listing: { id: listings.id, title: listings.title, thumbnail_url: listings.thumbnail_url } })
      .from(listingReviews).innerJoin(listings, eq(listings.id, listingReviews.listing_id))
      .where(and(eq(listingReviews.reviewer_user_id, userId), isNull(listingReviews.deleted_at)))
      .orderBy(desc(listingReviews.created_at)).limit(limit).offset(offset);
  }

  async listingAnalytics(listingId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);
    const [summary] = await this.database.select({
      total_views: listings.view_count,
      views: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'view' and ${feedImpressions.created_at} >= ${since})::int`,
      unique_viewers: sql<number>`count(distinct ${feedImpressions.user_id}) filter (where ${feedImpressions.impression_type} = 'view' and ${feedImpressions.created_at} >= ${since})::int`,
      shares: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'share' and ${feedImpressions.created_at} >= ${since})::int`,
      saves: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'save' and ${feedImpressions.created_at} >= ${since})::int`,
      taps: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'tap' and ${feedImpressions.created_at} >= ${since})::int`,
      watches: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'watch' and ${feedImpressions.created_at} >= ${since})::int`,
      contacts: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'contact_seller' and ${feedImpressions.created_at} >= ${since})::int`,
      negotiations_started: sql<number>`count(*) filter (where ${feedImpressions.impression_type} = 'negotiation_started' and ${feedImpressions.created_at} >= ${since})::int`,
    }).from(listings).leftJoin(feedImpressions, eq(feedImpressions.listing_id, listings.id)).where(eq(listings.id, listingId)).groupBy(listings.id);
    return summary ?? null;
  }
}
