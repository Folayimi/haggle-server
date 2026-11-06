import { Router, type Request, type Response } from "express";
import { catalogRepository, messagingRepository } from "../storage";
import { getBearerUserId } from "./http";

const router = Router();

const authenticatedUser = (req: Request, res: Response) => {
  const userId = getBearerUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
  return userId;
};

const requireMembership = async (
  req: Request,
  res: Response,
  userId: string,
) => {
  const isMember = await messagingRepository.isParticipant(
    req.params.id,
    userId,
  );
  if (!isMember) {
    res.status(403).json({ error: "You are not a conversation participant" });
    return false;
  }
  return true;
};

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUser(req, res);
    if (!userId) return;

    const limit = Number(req.query.limit ?? 50);
    const conversations = await messagingRepository.listConversations(userId);
    return res.json({
      data: conversations.slice(0, Math.min(Math.max(limit, 1), 100)),
      next_cursor: null,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUser(req, res);
    if (!userId) return;

    const body = req.body as {
      conversation_type?: string;
      seller_id?: string;
      listing_id?: string;
      session_id?: string;
      participant_ids?: string[];
    };

    const participantIds = Array.from(
      new Set([userId, ...(body.participant_ids ?? [])]),
    );
    if (!body.conversation_type || participantIds.length < 2) {
      return res.status(400).json({
        error:
          "conversation_type and at least one other participant are required",
      });
    }

    const conversation = await messagingRepository.createConversation({
      conversation_type: body.conversation_type as never,
      seller_id: body.seller_id,
      listing_id: body.listing_id,
      session_id: body.session_id,
      participant_ids: participantIds,
    });

    return res.status(201).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUser(req, res);
    if (!userId || !(await requireMembership(req, res, userId))) return;

    const before =
      typeof req.query.before === "string"
        ? new Date(req.query.before)
        : undefined;
    const messages = await messagingRepository.listMessages(
      req.params.id,
      before && !Number.isNaN(before.valueOf()) ? before : undefined,
      Number(req.query.limit ?? 50),
    );
    const details = await messagingRepository.listMessageDetails(
      req.params.id,
      messages.map((message) => message.id),
    );

    return res.json({
      data: messages,
      attachments: details.attachments,
      receipts: details.receipts,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUser(req, res);
    if (!userId || !(await requireMembership(req, res, userId))) return;

    const body = req.body as {
      message_type?: string;
      text_body?: string;
      voice_url?: string;
      negotiation_thread_id?: string;
      listing_id?: string;
      voice_duration_seconds?: number;
      shared_listing_id?: string;
      metadata_json?: unknown;
    };
    if (!body.message_type) {
      return res.status(400).json({ error: "message_type is required" });
    }

    let attachedListing = null;

    if (body.listing_id) {
      attachedListing = await catalogRepository.getListingById(
        body.listing_id ?? "",
      );
      if (!attachedListing) {
        return res.status(400).json({ error: "Invalid listing_id" });
      }
    }

    const message = await messagingRepository.sendMessage({
      conversation_id: req.params.id,
      sender_user_id: userId,
      message_type: body.message_type as never,
      text_body: body.text_body,
      voice_url: body.voice_url,
      negotiation_thread_id: body.negotiation_thread_id,
      listing: attachedListing
        ? { ...attachedListing, medias: attachedListing.medias ?? [] }
        : {},
      voice_duration_seconds: body.voice_duration_seconds,
      shared_listing_id: body.shared_listing_id,
      metadata_json: body.metadata_json,
    });
    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

router.patch(
  "/:id/messages/:messageId",
  async (req: Request, res: Response) => {
    try {
      const userId = authenticatedUser(req, res);
      if (!userId || !(await requireMembership(req, res, userId))) return;
      const textBody = (req.body as { text_body?: string }).text_body;
      if (!textBody?.trim()) {
        return res.status(400).json({ error: "text_body is required" });
      }
      const message = await messagingRepository.editMessage(
        req.params.messageId,
        userId,
        textBody.trim(),
      );
      if (!message) return res.status(404).json({ error: "Message not found" });
      return res.json(message);
    } catch (error) {
      return res.status(500).json({ error: "Failed to edit message" });
    }
  },
);

router.delete(
  "/:id/messages/:messageId",
  async (req: Request, res: Response) => {
    try {
      const userId = authenticatedUser(req, res);
      if (!userId || !(await requireMembership(req, res, userId))) return;
      const message = await messagingRepository.deleteMessage(
        req.params.messageId,
        userId,
      );
      if (!message) return res.status(404).json({ error: "Message not found" });
      return res.json(message);
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete message" });
    }
  },
);

router.post(
  "/:id/messages/:messageId/attachments",
  async (req: Request, res: Response) => {
    try {
      const userId = authenticatedUser(req, res);
      if (!userId || !(await requireMembership(req, res, userId))) return;
      const body = req.body as {
        attachment_type?: string;
        url?: string;
        thumbnail_url?: string;
        size_bytes?: number;
      };
      if (!body.attachment_type || !body.url) {
        return res
          .status(400)
          .json({ error: "attachment_type and url are required" });
      }
      if (
        !["screenshot", "image", "video", "document"].includes(
          body.attachment_type,
        )
      ) {
        return res.status(400).json({ error: "Invalid attachment_type" });
      }
      const attachment = await messagingRepository.addAttachmentToConversation(
        req.params.id,
        req.params.messageId,
        {
          attachment_type: body.attachment_type as never,
          url: body.url,
          thumbnail_url: body.thumbnail_url,
          size_bytes: body.size_bytes,
        },
      );
      return res.status(201).json(attachment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to add attachment" });
    }
  },
);

router.post(
  "/:id/messages/:messageId/receipts",
  async (req: Request, res: Response) => {
    try {
      const userId = authenticatedUser(req, res);
      if (!userId || !(await requireMembership(req, res, userId))) return;
      const status = (req.body as { status?: string }).status;
      if (!status) return res.status(400).json({ error: "status is required" });
      const receipt = await messagingRepository.markMessageReceipt(
        req.params.id,
        req.params.messageId,
        userId,
        status as never,
      );
      return res.json(receipt);
    } catch (error) {
      return res.status(500).json({ error: "Failed to mark receipt" });
    }
  },
);

router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const userId = authenticatedUser(req, res);
    if (!userId || !(await requireMembership(req, res, userId))) return;
    const messageId = (req.body as { message_id?: string }).message_id;
    if (!messageId)
      return res.status(400).json({ error: "message_id is required" });
    const state = await messagingRepository.updateReadState(
      req.params.id,
      userId,
      messageId,
    );
    return res.json(state);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update read state" });
  }
});

export default router;
