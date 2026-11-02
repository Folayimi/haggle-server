import { and, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  negotiationEvents,
  negotiationThreads,
  offers,
  deals,
} from "../../src/db/schema/negotiation";
import { listings } from "../../src/db/schema/catalog";
import {
  conversationParticipants,
  conversations,
  messages,
} from "../../src/db/schema/messaging";
import {
  NegotiationEventType,
  NegotiationThreadStatus,
  OfferKind,
} from "../../src/db/schema";

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

export interface CreateNegotiationInput {
  conversation_id: string;
  listing_id: string;
  buyer_id: string;
  quantity: number;
  variant_selection?: unknown;
}

export class NegotiationRepository extends BaseRepository {
  async createNegotiation(input: CreateNegotiationInput) {
    const [listing] = await this.database
      .select()
      .from(listings)
      .where(eq(listings.id, input.listing_id))
      .limit(1);
    if (
      !listing ||
      listing.status !== "published" ||
      listing.inventory_count < input.quantity
    ) {
      throw new Error("Listing unavailable");
    }
    if (listing.seller_id === input.buyer_id) {
      throw new Error("A seller cannot negotiate with themselves");
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error("Quantity must be a positive integer");
    }

    const members = await this.database
      .select()
      .from(conversationParticipants)
      .where(
        eq(conversationParticipants.conversation_id, input.conversation_id),
      );
    if (
      !members.some((member) => member.user_id === input.buyer_id) ||
      !members.some((member) => member.user_id === listing.seller_id)
    ) {
      throw new Error("Conversation must contain the buyer and listing seller");
    }

    const [existing] = await this.database
      .select()
      .from(negotiationThreads)
      .where(
        and(
          eq(negotiationThreads.conversation_id, input.conversation_id),
          eq(negotiationThreads.listing_id, input.listing_id),
          eq(negotiationThreads.buyer_id, input.buyer_id),
          eq(negotiationThreads.seller_id, listing.seller_id),
          eq(negotiationThreads.status, NegotiationThreadStatus.ACTIVE),
        ),
      )
      .limit(1);
    if (existing) return existing;

    const [thread] = await this.database
      .insert(negotiationThreads)
      .values({
        conversation_id: input.conversation_id,
        listing_id: input.listing_id,
        buyer_id: input.buyer_id,
        seller_id: listing.seller_id,
        quantity: input.quantity,
        variant_snapshot: input.variant_selection,
        current_offer_amount: listing.starting_amount ?? "0",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    await this.database.insert(messages).values({
      conversation_id: input.conversation_id,
      sender_user_id: input.buyer_id,
      message_type: "negotiation_event",
      metadata_json: JSON.stringify({
        negotiation_id: thread.id,
        event: "created",
      }),
      text_body: "Negotiation started",
    });
    return thread;
  }

  async getNegotiation(id: string) {
    const [thread] = await this.database
      .select()
      .from(negotiationThreads)
      .where(eq(negotiationThreads.id, id))
      .limit(1);
    return thread ?? null;
  }

  async listOffersForNegotiation(threadId: string) {
    return this.database
      .select()
      .from(offers)
      .where(eq(offers.thread_id, threadId))
      .orderBy(offers.sequence_no);
  }

  async submitNegotiationOffer(
    threadId: string,
    actorUserId: string,
    amount: string,
    currency: string,
  ) {
    const thread = this.assertFound(
      await this.getNegotiation(threadId),
      "Negotiation not found",
    );
    if (![thread.buyer_id, thread.seller_id].includes(actorUserId)) {
      throw new Error("User is not a negotiation participant");
    }
    if (
      thread.status !== NegotiationThreadStatus.ACTIVE ||
      new Date() > thread.expires_at
    ) {
      throw new Error("Negotiation is inactive");
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("Offer amount must be positive");
    }
    const [listing] = await this.database
      .select({
        currency: listings.price_currency,
        minimum: listings.lowest_amount,
      })
      .from(listings)
      .where(eq(listings.id, thread.listing_id));
    if (!listing || listing.currency !== currency) {
      throw new Error("Offer currency does not match listing currency");
    }
    if (listing.minimum && numericAmount < Number(listing.minimum)) {
      throw new Error("Offer is below the seller's acceptable range");
    }
    const pending = await this.database
      .select()
      .from(offers)
      .where(and(eq(offers.thread_id, threadId), eq(offers.status, "pending")))
      .limit(1);
    if (pending.length > 0) throw new Error("A pending offer already exists");

    return this.createOffer({
      thread_id: threadId,
      listing_id: thread.listing_id,
      buyer_id: thread.buyer_id,
      seller_id: thread.seller_id,
      sender_user_id: actorUserId,
      amount,
      currency,
      offer_kind: OfferKind.OFFER,
    });
  }

  async acceptNegotiationOffer(offerId: string, actorUserId: string) {
    const [offer] = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);
    const selectedOffer = this.assertFound(offer, "Offer not found");
    const thread = this.assertFound(
      await this.getNegotiation(selectedOffer.thread_id),
      "Negotiation not found",
    );
    const recipient =
      selectedOffer.sender_user_id === thread.buyer_id
        ? thread.seller_id
        : thread.buyer_id;
    if (recipient !== actorUserId || selectedOffer.status !== "pending") {
      throw new Error("Only the offer recipient can accept this pending offer");
    }
    if (selectedOffer.expires_at && new Date() > selectedOffer.expires_at) {
      throw new Error("Offer expired");
    }

    const [listing] = await this.database
      .select()
      .from(listings)
      .where(eq(listings.id, thread.listing_id));
    if (
      !listing ||
      listing.status !== "published" ||
      listing.inventory_count < thread.quantity
    ) {
      throw new Error("Listing is no longer available");
    }

    const [deal] = await this.database.transaction(async (tx) => {
      const [updatedOffer] = await tx
        .update(offers)
        .set({ status: "accepted" })
        .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
        .returning();
      if (!updatedOffer) throw new Error("Offer was already processed");
      await tx
        .update(offers)
        .set({ status: "superseded" })
        .where(
          and(
            eq(offers.thread_id, thread.id),
            eq(offers.status, "pending"),
            ne(offers.id, offerId),
          ),
        );
      await tx
        .update(negotiationThreads)
        .set({
          status: "accepted",
          accepted_offer_id: offerId,
          current_offer_amount: selectedOffer.amount,
        })
        .where(
          and(
            eq(negotiationThreads.id, thread.id),
            eq(negotiationThreads.status, NegotiationThreadStatus.ACTIVE),
          ),
        );
      return tx
        .insert(deals)
        .values({
          negotiation_id: thread.id,
          accepted_offer_id: offerId,
          buyer_id: thread.buyer_id,
          seller_id: thread.seller_id,
          listing_id: thread.listing_id,
          amount: selectedOffer.amount,
          currency: selectedOffer.currency,
          quantity: thread.quantity,
          variant_snapshot: thread.variant_snapshot,
        })
        .returning();
    });
    return deal;
  }

  async counterNegotiationOffer(
    offerId: string,
    actorUserId: string,
    amount: string,
    currency: string,
  ) {
    const [offer] = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);
    const selectedOffer = this.assertFound(offer, "Offer not found");
    const thread = this.assertFound(
      await this.getNegotiation(selectedOffer.thread_id),
      "Negotiation not found",
    );
    const recipient =
      selectedOffer.sender_user_id === thread.buyer_id
        ? thread.seller_id
        : thread.buyer_id;
    if (recipient !== actorUserId || selectedOffer.status !== "pending") {
      throw new Error(
        "Only the offer recipient can counter this pending offer",
      );
    }
    await this.database
      .update(offers)
      .set({ status: "countered" })
      .where(eq(offers.id, offerId));
    return this.createOffer({
      thread_id: thread.id,
      listing_id: thread.listing_id,
      buyer_id: thread.buyer_id,
      seller_id: thread.seller_id,
      sender_user_id: actorUserId,
      amount,
      currency,
      offer_kind: OfferKind.COUNTER,
      parent_offer_id: offerId,
    });
  }

  async rejectNegotiationOffer(offerId: string, actorUserId: string) {
    const [offer] = await this.database
      .select()
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);
    const selectedOffer = this.assertFound(offer, "Offer not found");
    const thread = this.assertFound(
      await this.getNegotiation(selectedOffer.thread_id),
      "Negotiation not found",
    );
    const recipient =
      selectedOffer.sender_user_id === thread.buyer_id
        ? thread.seller_id
        : thread.buyer_id;
    if (recipient !== actorUserId || selectedOffer.status !== "pending") {
      throw new Error("Only the offer recipient can reject this pending offer");
    }
    const [updated] = await this.database
      .update(offers)
      .set({ status: "rejected" })
      .where(eq(offers.id, offerId))
      .returning();
    return updated;
  }

  async withdrawNegotiationOffer(offerId: string, actorUserId: string) {
    const [updated] = await this.database
      .update(offers)
      .set({ status: "withdrawn" })
      .where(
        and(
          eq(offers.id, offerId),
          eq(offers.sender_user_id, actorUserId),
          eq(offers.status, "pending"),
        ),
      )
      .returning();
    if (!updated) throw new Error("Offer cannot be withdrawn");
    return updated;
  }

  async getDealForNegotiation(negotiationId: string, actorUserId: string) {
    const thread = this.assertFound(
      await this.getNegotiation(negotiationId),
      "Negotiation not found",
    );
    if (![thread.buyer_id, thread.seller_id].includes(actorUserId)) {
      throw new Error("User is not a negotiation participant");
    }
    const [deal] = await this.database
      .select()
      .from(deals)
      .where(eq(deals.negotiation_id, negotiationId))
      .limit(1);
    return deal ?? null;
  }
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
        conversation_id: undefined,
        session_id: input.session_id,
        listing_id: input.listing_id,
        buyer_id: input.buyer_id,
        seller_id: input.seller_id,
        current_offer_amount: input.amount,
        last_offer_at: new Date(),
        expires_at: input.expires_at ?? new Date(Date.now() + 2 * 60 * 1000),
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

    const eventSessionId = input.session_id ?? thread.session_id ?? undefined;
    if (eventSessionId) {
      await this.database.insert(negotiationEvents).values({
        thread_id: thread.id,
        session_id: eventSessionId,
        actor_user_id: input.sender_user_id,
        event_type: NegotiationEventType.OFFER_MADE,
        payload_json: { offer_id: offer.id, amount: input.amount },
      });
    }

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
    const thread = this.assertFound(
      threadRows[0],
      "Negotiation thread not found",
    );

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
