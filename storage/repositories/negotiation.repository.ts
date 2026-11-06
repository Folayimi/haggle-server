import { and, desc, eq, isNull, ne } from "drizzle-orm";
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
import { AppError } from "../../src/errors/app-error";

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

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
  private async validateOfferInput(
    tx: any,
    thread: typeof negotiationThreads.$inferSelect,
    amount: string,
    currency: string,
  ) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new AppError("Offer amount must be positive", 400);
    }

    const [listing] = await tx
      .select({
        currency: listings.price_currency,
        minimum: listings.lowest_amount,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.id, thread.listing_id))
      .limit(1);

    if (!listing || listing.status !== "published") {
      throw new AppError("Listing unavailable", 404);
    }

    if (listing.currency !== currency) {
      throw new AppError("Offer currency does not match listing currency", 400);
    }

    if (listing.minimum && numericAmount < Number(listing.minimum)) {
      throw new AppError("Offer is below the seller's acceptable range", 400);
    }
  }

  private async createOfferInTransaction(
    tx: any,
    input: {
      threadId: string;
      listingId: string;
      senderUserId: string;
      amount: string;
      currency: string;
      offerKind: (typeof OfferKind)[keyof typeof OfferKind];
      parentOfferId?: string;
    },
  ) {
    const latest = await tx
      .select({ sequenceNo: offers.sequence_no })
      .from(offers)
      .where(eq(offers.thread_id, input.threadId))
      .orderBy(desc(offers.sequence_no))
      .limit(1);

    const sequenceNo = (latest[0]?.sequenceNo ?? 0) + 1;

    const [createdOffer] = await tx
      .insert(offers)
      .values({
        thread_id: input.threadId,
        listing_id: input.listingId,
        sender_user_id: input.senderUserId,
        offer_kind: input.offerKind,
        amount: input.amount,
        currency: input.currency,
        sequence_no: sequenceNo,
        parent_offer_id: input.parentOfferId,
      })
      .returning();

    await tx
      .update(negotiationThreads)
      .set({
        current_offer_amount: input.amount,
        last_offer_at: new Date(),
      })
      .where(eq(negotiationThreads.id, input.threadId));

    return createdOffer;
  }

  /**
   * Inserts a conversation timeline event for a negotiation action.
   *
   * This is intentionally called inside the same transaction as the
   * corresponding offer/deal mutation.
   *
   * Session-only negotiation threads do not have a conversation, so
   * they simply skip this message insertion.
   */
  private async createConversationEvent(
    tx: any,
    input: {
      thread: typeof negotiationThreads.$inferSelect;
      actorUserId: string;
      messageType: "offer" | "negotiation_event" | "deal_event";
      text: string;
      metadata: Record<string, unknown>;
    },
  ) {
    if (!input.thread.conversation_id) return;

    await tx.insert(messages).values({
      conversation_id: input.thread.conversation_id,
      negotiation_thread_id: input.thread.id,
      sender_user_id: input.actorUserId,
      message_type: input.messageType,
      text_body: input.text,
      metadata_json: JSON.stringify({
        negotiation_id: input.thread.id,
        ...input.metadata,
      }),
    });
  }

  private assertActiveThread(thread: typeof negotiationThreads.$inferSelect) {
    if (thread.status !== NegotiationThreadStatus.ACTIVE) {
      throw new AppError("Negotiation is no longer active", 409);
    }

    if (thread.expires_at && new Date() > thread.expires_at) {
      throw new AppError("Negotiation has expired", 409);
    }
  }

  private assertOfferRecipient(
    offer: typeof offers.$inferSelect,
    thread: typeof negotiationThreads.$inferSelect,
    actorUserId: string,
    action: "accept" | "counter" | "reject",
  ) {
    const senderIsBuyer = offer.sender_user_id === thread.buyer_id;
    const senderIsSeller = offer.sender_user_id === thread.seller_id;

    if (!senderIsBuyer && !senderIsSeller) {
      throw new AppError("Offer sender is not a negotiation participant", 403);
    }

    const recipient = senderIsBuyer ? thread.seller_id : thread.buyer_id;

    if (recipient !== actorUserId) {
      throw new AppError(
        `Only the offer recipient can ${action} this offer`,
        403,
      );
    }
  }

  async createNegotiation(input: CreateNegotiationInput) {
    const [conversation] = await this.database
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, input.conversation_id))
      .limit(1);

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new AppError("Quantity must be a positive integer", 400);
    }

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
      throw new AppError("Listing unavailable", 404);
    }

    if (listing.seller_id === input.buyer_id) {
      throw new AppError("A seller cannot negotiate with themselves", 400);
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
      throw new AppError(
        "Conversation must contain the buyer and listing seller",
        403,
      );
    }

    try {
      return await this.database.transaction(async (tx) => {
        const [existing] = await tx
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

        const [thread] = await tx
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

        await tx.insert(messages).values({
          conversation_id: input.conversation_id,
          negotiation_thread_id: thread.id,
          sender_user_id: input.buyer_id,
          message_type: "negotiation_event",
          metadata_json: JSON.stringify({
            negotiation_id: thread.id,
            event: "created",
          }),
          text_body: "Negotiation started",
        });

        return thread;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      // Another request may have created the same active thread first.
      const [existingAfterRace] = await this.database
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

      if (existingAfterRace) return existingAfterRace;

      throw error;
    }
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
    return this.database.transaction(async (tx) => {
      const [thread] = await tx
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, threadId))
        .for("update")
        .limit(1);

      if (!thread) {
        throw new AppError("Negotiation not found", 404);
      }

      if (![thread.buyer_id, thread.seller_id].includes(actorUserId)) {
        throw new AppError("User is not a negotiation participant", 403);
      }

      this.assertActiveThread(thread);
      await this.validateOfferInput(tx, thread, amount, currency);

      const pending = await tx
        .select({ id: offers.id })
        .from(offers)
        .where(
          and(eq(offers.thread_id, threadId), eq(offers.status, "pending")),
        )
        .limit(1);

      if (pending.length > 0) {
        throw new AppError("A pending offer already exists", 409);
      }

      const offer = await this.createOfferInTransaction(tx, {
        threadId,
        listingId: thread.listing_id,
        senderUserId: actorUserId,
        amount,
        currency,
        offerKind: OfferKind.OFFER,
      });

      await this.createConversationEvent(tx, {
        thread,
        actorUserId,
        messageType: "offer",
        text: "Offer submitted",
        metadata: {
          event: "offer_submitted",
          offer_id: offer.id,
          amount: offer.amount,
          currency: offer.currency,
          offer_kind: offer.offer_kind,
        },
      });

      return offer;
    });
  }

  async acceptNegotiationOffer(offerId: string, actorUserId: string) {
    return this.database.transaction(async (tx) => {
      const [initialOffer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!initialOffer) {
        throw new AppError("Offer not found", 404);
      }

      // Lock the thread first so all actions on this negotiation serialize.
      const [thread] = await tx
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, initialOffer.thread_id))
        .for("update")
        .limit(1);

      if (!thread) {
        throw new AppError("Negotiation not found", 404);
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .for("update")
        .limit(1);

      if (!offer || offer.status !== "pending") {
        throw new AppError("Offer was already processed", 409);
      }

      this.assertOfferRecipient(offer, thread, actorUserId, "accept");
      this.assertActiveThread(thread);

      if (offer.expires_at && new Date() > offer.expires_at) {
        throw new AppError("Offer has expired", 409);
      }

      // Lock and recheck listing inventory inside this transaction.
      const [listing] = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, thread.listing_id))
        .for("update")
        .limit(1);

      if (
        !listing ||
        listing.status !== "published" ||
        listing.inventory_count < thread.quantity
      ) {
        throw new AppError("Listing is no longer available", 409);
      }

      const [updatedOffer] = await tx
        .update(offers)
        .set({ status: "accepted" })
        .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
        .returning();

      if (!updatedOffer) {
        throw new AppError("Offer was already processed", 409);
      }

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

      const [updatedThread] = await tx
        .update(negotiationThreads)
        .set({
          status: NegotiationThreadStatus.ACCEPTED,
          accepted_offer_id: offerId,
          current_offer_amount: offer.amount,
        })
        .where(
          and(
            eq(negotiationThreads.id, thread.id),
            eq(negotiationThreads.status, NegotiationThreadStatus.ACTIVE),
          ),
        )
        .returning();

      if (!updatedThread) {
        throw new AppError("Negotiation is no longer active", 409);
      }

      const [deal] = await tx
        .insert(deals)
        .values({
          negotiation_id: thread.id,
          accepted_offer_id: offerId,
          buyer_id: thread.buyer_id,
          seller_id: thread.seller_id,
          listing_id: thread.listing_id,
          amount: offer.amount,
          currency: offer.currency,
          quantity: thread.quantity,
          variant_snapshot: thread.variant_snapshot,
        })
        .returning();

      await this.createConversationEvent(tx, {
        thread,
        actorUserId,
        messageType: "deal_event",
        text: "Offer accepted — deal agreed",
        metadata: {
          event: "offer_accepted",
          offer_id: offer.id,
          deal_id: deal.id,
          amount: deal.amount,
          currency: deal.currency,
        },
      });

      return deal;
    });
  }

  async counterNegotiationOffer(
    offerId: string,
    actorUserId: string,
    amount: string,
    currency: string,
  ) {
    return this.database.transaction(async (tx) => {
      const [initialOffer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!initialOffer) {
        throw new AppError("Offer not found", 404);
      }

      const [thread] = await tx
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, initialOffer.thread_id))
        .for("update")
        .limit(1);

      if (!thread) {
        throw new AppError("Negotiation not found", 404);
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .for("update")
        .limit(1);

      if (!offer || offer.status !== "pending") {
        throw new AppError("Offer is no longer pending", 409);
      }

      this.assertOfferRecipient(offer, thread, actorUserId, "counter");
      this.assertActiveThread(thread);

      if (offer.expires_at && new Date() > offer.expires_at) {
        throw new AppError("Offer has expired", 409);
      }

      await this.validateOfferInput(tx, thread, amount, currency);

      const [updatedOffer] = await tx
        .update(offers)
        .set({ status: "countered" })
        .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
        .returning();

      if (!updatedOffer) {
        throw new AppError("Offer was already processed", 409);
      }

      const counterOffer = await this.createOfferInTransaction(tx, {
        threadId: thread.id,
        listingId: thread.listing_id,
        senderUserId: actorUserId,
        amount,
        currency,
        offerKind: OfferKind.COUNTER,
        parentOfferId: offerId,
      });

      await this.createConversationEvent(tx, {
        thread,
        actorUserId,
        messageType: "offer",
        text: "Counteroffer submitted",
        metadata: {
          event: "offer_countered",
          offer_id: counterOffer.id,
          parent_offer_id: offerId,
          amount: counterOffer.amount,
          currency: counterOffer.currency,
          offer_kind: counterOffer.offer_kind,
        },
      });

      return counterOffer;
    });
  }

  async rejectNegotiationOffer(offerId: string, actorUserId: string) {
    return this.database.transaction(async (tx) => {
      const [initialOffer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!initialOffer) {
        throw new AppError("Offer not found", 404);
      }

      const [thread] = await tx
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, initialOffer.thread_id))
        .for("update")
        .limit(1);

      if (!thread) {
        throw new AppError("Negotiation not found", 404);
      }

      const [offer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .for("update")
        .limit(1);

      if (!offer || offer.status !== "pending") {
        throw new AppError("Offer is no longer pending", 409);
      }

      this.assertOfferRecipient(offer, thread, actorUserId, "reject");
      this.assertActiveThread(thread);

      if (offer.expires_at && new Date() > offer.expires_at) {
        throw new AppError("Offer has expired", 409);
      }

      const [updatedOffer] = await tx
        .update(offers)
        .set({ status: "rejected" })
        .where(and(eq(offers.id, offerId), eq(offers.status, "pending")))
        .returning();

      if (!updatedOffer) {
        throw new AppError("Offer was already processed", 409);
      }

      await this.createConversationEvent(tx, {
        thread,
        actorUserId,
        messageType: "negotiation_event",
        text: "Offer declined",
        metadata: {
          event: "offer_rejected",
          offer_id: offerId,
        },
      });

      return updatedOffer;
    });
  }

  async withdrawNegotiationOffer(offerId: string, actorUserId: string) {
    return this.database.transaction(async (tx) => {
      const [initialOffer] = await tx
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (!initialOffer) {
        throw new AppError("Offer not found", 404);
      }

      const [thread] = await tx
        .select()
        .from(negotiationThreads)
        .where(eq(negotiationThreads.id, initialOffer.thread_id))
        .for("update")
        .limit(1);

      if (!thread) {
        throw new AppError("Negotiation not found", 404);
      }

      this.assertActiveThread(thread);

      if (initialOffer.expires_at && new Date() > initialOffer.expires_at) {
        throw new AppError("Offer has expired", 409);
      }

      if (
        ![thread.buyer_id, thread.seller_id].includes(actorUserId) ||
        initialOffer.sender_user_id !== actorUserId
      ) {
        throw new AppError("Only the offer sender can withdraw it", 403);
      }

      const [updatedOffer] = await tx
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

      if (!updatedOffer) {
        throw new AppError("Offer cannot be withdrawn", 409);
      }

      await this.createConversationEvent(tx, {
        thread,
        actorUserId,
        messageType: "negotiation_event",
        text: "Offer withdrawn",
        metadata: {
          event: "offer_withdrawn",
          offer_id: offerId,
        },
      });

      return updatedOffer;
    });
  }

  async getDealForNegotiation(negotiationId: string, actorUserId: string) {
    const thread = this.assertFound(
      await this.getNegotiation(negotiationId),
      "Negotiation not found",
    );

    if (![thread.buyer_id, thread.seller_id].includes(actorUserId)) {
      throw new AppError("User is not a negotiation participant", 403);
    }

    const [deal] = await this.database
      .select()
      .from(deals)
      .where(eq(deals.negotiation_id, negotiationId))
      .limit(1);

    return deal ?? null;
  }

  // ---------------------------------------------------------------------------
  // Legacy/session negotiation methods.
  // Keep these until all session-related routes have been migrated.
  // ---------------------------------------------------------------------------

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
            : isNull(negotiationThreads.session_id),
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
