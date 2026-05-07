import { desc, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import {
  conversationParticipants,
  conversations,
  messageAttachments,
  messageReceipts,
  messages,
} from "../../src/db/schema/messaging";
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

    return Promise.all(
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

        return {
          ...(conversation[0] ?? {}),
          participants,
        };
      }),
    );
  }

  async createConversation(input: CreateConversationInput) {
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

  async listMessages(conversationId: string) {
    return this.database
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(desc(messages.created_at));
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

  async markMessageReceipt(
    messageId: string,
    userId: string,
    status: (typeof MessageReceiptStatus)[keyof typeof MessageReceiptStatus],
  ) {
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
