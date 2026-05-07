import { and, desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  negotiationEvents,
  negotiationThreads,
  offers,
} from "../../src/db/schema/negotiation";
import { NegotiationEventType, NegotiationThreadStatus, OfferKind } from "../../src/db/schema";

export interface CreateOfferInput {
  session_id?: string;
  thread_id?: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  sender_user_id: string;
  amount: string;
  currency?: string;
  offer_kind?: (typeof OfferKind)[keyof typeof OfferKind];
  parent_offer_id?: string;
  expires_at?: Date;
}

export class NegotiationRepository extends BaseRepository {
  private async getNextSequence(threadId: string) {
    const latest = await this.database
      .select()
      .from(offers)
      .where(eq(offers.thread_id, threadId))
      .orderBy(desc(offers.sequence_no))
      .limit(1);

    return latest[0]?.sequence_no ? latest[0].sequence_no + 1 : 1;
  }

  private async findOrCreateThread(input: CreateOfferInput) {
    if (input.thread_id) {
      const existing = await this.database
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, input.thread_id));

      if (existing[0]) {
        return existing[0];
      }
    }

    const existing = await this.database
      .select()
      .from(negotiationThreads)
      .where(
        and(
          eq(negotiationThreads.listing_id, input.listing_id),
          eq(negotiationThreads.buyer_id, input.buyer_id),
          eq(negotiationThreads.seller_id, input.seller_id),
          input.session_id
            ? eq(negotiationThreads.session_id, input.session_id)
            : eq(negotiationThreads.session_id, negotiationThreads.session_id),
          eq(negotiationThreads.status, NegotiationThreadStatus.ACTIVE),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [thread] = await this.database
      .insert(negotiationThreads)
      .values({
        session_id: input.session_id,
        listing_id: input.listing_id,
        buyer_id: input.buyer_id,
        seller_id: input.seller_id,
        current_offer_amount: input.amount,
        last_offer_at: new Date(),
        expires_at:
          input.expires_at ?? new Date(Date.now() + 2 * 60 * 1000),
      })
      .returning();

    return thread;
  }

  async createOffer(input: CreateOfferInput) {
    const thread = await this.findOrCreateThread(input);
    const sequenceNo = await this.getNextSequence(thread.id);

    const [offer] = await this.database
      .insert(offers)
      .values({
        thread_id: thread.id,
        session_id: input.session_id ?? thread.session_id,
        listing_id: input.listing_id,
        sender_user_id: input.sender_user_id,
        offer_kind: input.offer_kind ?? OfferKind.OFFER,
        amount: input.amount,
        currency: input.currency ?? "USD",
        sequence_no: sequenceNo,
        parent_offer_id: input.parent_offer_id,
        expires_at: input.expires_at,
      })
      .returning();

    await this.database
      .update(negotiationThreads)
      .set({
        current_offer_amount: input.amount,
        last_offer_at: new Date(),
      })
      .where(eq(negotiationThreads.id, thread.id));

    await this.database.insert(negotiationEvents).values({
      thread_id: thread.id,
      session_id: input.session_id ?? thread.session_id!,
      actor_user_id: input.sender_user_id,
      event_type: NegotiationEventType.OFFER_MADE,
      payload_json: { offer_id: offer.id, amount: input.amount },
    });

    return offer;
  }

  async acceptOffer(offerId: string, actorUserId?: string) {
    const selected = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    const offer = this.assertFound(selected[0], "Offer not found");

    const [thread] = await this.database
      .update(negotiationThreads)
      .set({
        status: NegotiationThreadStatus.ACCEPTED,
        accepted_offer_id: offerId,
      })
      .where(eq(negotiationThreads.id, offer.thread_id))
      .returning();

    if (offer.session_id) {
      await this.database.insert(negotiationEvents).values({
        thread_id: offer.thread_id,
        session_id: offer.session_id,
        actor_user_id: actorUserId ?? offer.sender_user_id,
        event_type: NegotiationEventType.OFFER_ACCEPTED,
        payload_json: { offer_id: offerId },
      });
    }

    return thread ?? null;
  }

  async counterOffer(
    offerId: string,
    input: { sender_user_id: string; amount: string; currency?: string },
  ) {
    const selected = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    const parentOffer = this.assertFound(selected[0], "Offer not found");
    const threadRows = await this.database
      .select()
      .from(negotiationThreads)
      .where(eq(negotiationThreads.id, parentOffer.thread_id))
      .limit(1);
    const thread = this.assertFound(threadRows[0], "Negotiation thread not found");

    return this.createOffer({
      thread_id: thread.id,
      session_id: parentOffer.session_id ?? undefined,
      listing_id: parentOffer.listing_id,
      buyer_id: thread.buyer_id,
      seller_id: thread.seller_id,
      sender_user_id: input.sender_user_id,
      amount: input.amount,
      currency: input.currency ?? parentOffer.currency,
      offer_kind: OfferKind.COUNTER,
      parent_offer_id: parentOffer.id,
    });
  }

  async rejectOffer(offerId: string, actorUserId?: string) {
    const selected = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);

    const offer = this.assertFound(selected[0], "Offer not found");

    const [thread] = await this.database
      .update(negotiationThreads)
      .set({ status: NegotiationThreadStatus.REJECTED })
      .where(eq(negotiationThreads.id, offer.thread_id))
      .returning();

    if (offer.session_id) {
      await this.database.insert(negotiationEvents).values({
        thread_id: offer.thread_id,
        session_id: offer.session_id,
        actor_user_id: actorUserId ?? offer.sender_user_id,
        event_type: NegotiationEventType.OFFER_DECLINED,
        payload_json: { offer_id: offerId },
      });
    }

    return thread ?? null;
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
