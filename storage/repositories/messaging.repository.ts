import { and, count, desc, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  conversationParticipants,
  conversations,
  messageAttachments,
  messageReceipts,
  messages,
} from "../../src/db/schema/messaging";
import { users } from "../../src/db/schema/auth";
import { listings } from "../../src/db/schema/catalog";
import { ConversationType } from "../../src/db/schema";
import { MessageReceiptStatus } from "../../src/db/schema";

type ConversationInsert = typeof conversations.$inferInsert;
type MessageInsert = typeof messages.$inferInsert;
type MessageAttachmentInsert = typeof messageAttachments.$inferInsert;

export interface CreateConversationInput {
  conversation_type: ConversationInsert["conversation_type"];
  seller_id?: string;
  listing_id?: string;
  session_id?: string;
  participant_ids: string[];
}

export class MessagingRepository extends BaseRepository {
  async isParticipant(conversationId: string, userId: string) {
    const [membership] = await this.database
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversation_id, conversationId),
          eq(conversationParticipants.user_id, userId),
        ),
      )
      .limit(1);
    return Boolean(membership);
  }

  async listConversations(userId: string) {
    const memberships = await this.database
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.user_id, userId));

    const conversationIds = memberships.map(
      (membership) => membership.conversation_id,
    );

    if (conversationIds.length === 0) {
      return [];
    }

    const result = await Promise.all(
      conversationIds.map(async (conversationId) => {
        const [conversation, participants] = await Promise.all([
          this.database
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId)),
          this.database
            .select()
            .from(conversationParticipants)
            .where(eq(conversationParticipants.conversation_id, conversationId)),
        ]);

        const membership = memberships.find(
          (item) => item.conversation_id === conversationId,
        );
        const [unread] = await this.database
          .select({ value: count(messages.id) })
          .from(messages)
          .where(
            and(
              eq(messages.conversation_id, conversationId),
              ne(messages.sender_user_id, userId),
              membership?.last_read_at
                ? gt(messages.created_at, membership.last_read_at)
                : undefined,
            ),
          );

        return {
          ...(conversation[0] ?? {}),
          participants,
          unread_count: Number(unread?.value ?? 0),
        };
      }),
    );
    return result.sort((left, right) => {
      const leftTime = left.last_message_at?.getTime?.() ?? 0;
      const rightTime = right.last_message_at?.getTime?.() ?? 0;
      return rightTime - leftTime;
    });
  }

  async createConversation(input: CreateConversationInput) {
    const existingUsers = await this.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, input.participant_ids));
    if (existingUsers.length !== input.participant_ids.length) {
      throw new Error("One or more participants do not exist");
    }

    if (input.listing_id) {
      const [listing] = await this.database
        .select({ id: listings.id, seller_id: listings.seller_id })
        .from(listings)
        .where(eq(listings.id, input.listing_id))
        .limit(1);
      if (!listing || (input.seller_id && listing.seller_id !== input.seller_id)) {
        throw new Error("Listing and seller do not match");
      }
    }

    if (
      input.conversation_type === ConversationType.DIRECT &&
      input.participant_ids.length === 2
    ) {
      const memberships = await this.database
        .select()
        .from(conversationParticipants)
        .where(inArray(conversationParticipants.user_id, input.participant_ids));
      const conversationIds = [...new Set(memberships.map((row) => row.conversation_id))];
      for (const conversationId of conversationIds) {
        const participants = memberships.filter(
          (row) => row.conversation_id === conversationId,
        );
        if (participants.length === 2) {
          const [existing] = await this.database
            .select()
            .from(conversations)
            .where(
              and(
                eq(conversations.id, conversationId),
                eq(conversations.conversation_type, ConversationType.DIRECT),
              ),
            )
            .limit(1);
          if (existing) return existing;
        }
      }
    }

    const [conversation] = await this.database
      .insert(conversations)
      .values({
        conversation_type: input.conversation_type,
        seller_id: input.seller_id,
        listing_id: input.listing_id,
        session_id: input.session_id,
      })
      .returning();

    if (input.participant_ids.length > 0) {
      await this.database.insert(conversationParticipants).values(
        input.participant_ids.map((userId) => ({
          conversation_id: conversation.id,
          user_id: userId,
        })),
      );
    }

    return conversation;
  }

  async listMessages(conversationId: string, before?: Date, limit = 50) {
    return this.database
      .select()
      .from(messages)
      .where(
        before
          ? and(eq(messages.conversation_id, conversationId), lt(messages.created_at, before))
          : eq(messages.conversation_id, conversationId),
      )
      .orderBy(desc(messages.created_at))
      .limit(Math.min(Math.max(limit, 1), 100));
  }

  async sendMessage(
    input: Omit<MessageInsert, "metadata_json"> & {
      metadata_json?: unknown;
    },
  ) {
    const [message] = await this.database
      .insert(messages)
      .values({
        ...input,
        metadata_json: input.metadata_json
          ? JSON.stringify(input.metadata_json)
          : undefined,
      })
      .returning();

    await this.database
      .update(conversations)
      .set({
        last_message_at: new Date(),
        last_message_preview: message.text_body ?? message.message_type,
      })
      .where(eq(conversations.id, input.conversation_id));

    return message;
  }

  async addAttachment(input: MessageAttachmentInsert) {
    const [attachment] = await this.database
      .insert(messageAttachments)
      .values(input)
      .returning();

    return attachment;
  }

  async addAttachmentToConversation(
    conversationId: string,
    messageId: string,
    input: Omit<MessageAttachmentInsert, "message_id">,
  ) {
    const [message] = await this.database
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(eq(messages.id, messageId), eq(messages.conversation_id, conversationId)),
      )
      .limit(1);
    if (!message) throw new Error("Message not found in conversation");
    return this.addAttachment({ ...input, message_id: messageId });
  }

  async listMessageDetails(conversationId: string, messageIds: string[]) {
    if (messageIds.length === 0) {
      return { conversationId, attachments: [], receipts: [] };
    }
    const [attachments, receipts] = await Promise.all([
      this.database
        .select()
        .from(messageAttachments)
        .where(
          and(
            inArray(messageAttachments.message_id, messageIds),
          ),
        ),
      this.database
        .select()
        .from(messageReceipts)
        .where(inArray(messageReceipts.message_id, messageIds)),
    ]);

    return { conversationId, attachments, receipts };
  }

  async updateReadState(conversationId: string, userId: string, messageId: string) {
    const [membership] = await this.database
      .update(conversationParticipants)
      .set({ last_read_message_id: messageId, last_read_at: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversation_id, conversationId),
          eq(conversationParticipants.user_id, userId),
        ),
      )
      .returning();
    return membership ?? null;
  }

  async editMessage(messageId: string, senderUserId: string, textBody: string) {
    const [message] = await this.database
      .update(messages)
      .set({ text_body: textBody, edited_at: new Date() })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.sender_user_id, senderUserId),
          isNull(messages.deleted_at),
        ),
      )
      .returning();
    return message ?? null;
  }

  async deleteMessage(messageId: string, senderUserId: string) {
    const [message] = await this.database
      .update(messages)
      .set({ deleted_at: new Date(), text_body: null })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.sender_user_id, senderUserId),
          isNull(messages.deleted_at),
        ),
      )
      .returning();
    return message ?? null;
  }

  async markMessageReceipt(
    conversationId: string,
    messageId: string,
    userId: string,
    status: (typeof MessageReceiptStatus)[keyof typeof MessageReceiptStatus],
  ) {
    const [message] = await this.database
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.conversation_id, conversationId),
        ),
      )
      .limit(1);
    if (!message) throw new Error("Message not found");
    const existing = await this.database
      .select()
      .from(messageReceipts)
      .where(
        eq(messageReceipts.message_id, messageId),
      );

    const currentReceipt = existing.find((receipt) => receipt.user_id === userId);

    if (!currentReceipt) {
      const [receipt] = await this.database
        .insert(messageReceipts)
        .values({
          message_id: messageId,
          user_id: userId,
          status,
        })
        .returning();

      return receipt;
    }

    const [receipt] = await this.database
      .update(messageReceipts)
      .set({ status, updated_at: new Date() })
      .where(
        eq(messageReceipts.message_id, messageId),
      )
      .returning();

    return receipt;
  }
}
