import { Router, type Request, type Response } from "express";
import { messagingRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const conversations = await messagingRepository.listConversations(userId);
    return res.json(conversations);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch conversations", details: error });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      conversation_type?: string;
      seller_id?: string;
      listing_id?: string;
      session_id?: string;
      participant_ids?: string[];
    };

    if (!body.conversation_type || !body.participant_ids?.length) {
      return res.status(400).json({
        error: "conversation_type and participant_ids are required",
      });
    }

    const conversation = await messagingRepository.createConversation({
      conversation_type: body.conversation_type as never,
      seller_id: body.seller_id,
      listing_id: body.listing_id,
      session_id: body.session_id,
      participant_ids: body.participant_ids,
    });

    return res.status(201).json(conversation);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create conversation", details: error });
  }
});

router.get("/:id/messages", async (req: Request, res: Response) => {
  try {
    const messages = await messagingRepository.listMessages(req.params.id);
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch messages", details: error });
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      sender_user_id?: string;
      message_type?: string;
      text_body?: string;
      voice_url?: string;
      voice_duration_seconds?: number;
      shared_listing_id?: string;
      metadata_json?: unknown;
    };

    if (!body.sender_user_id || !body.message_type) {
      return res.status(400).json({ error: "sender_user_id and message_type are required" });
    }

    const message = await messagingRepository.sendMessage({
      conversation_id: req.params.id,
      sender_user_id: body.sender_user_id,
      message_type: body.message_type as never,
      text_body: body.text_body,
      voice_url: body.voice_url,
      voice_duration_seconds: body.voice_duration_seconds,
      shared_listing_id: body.shared_listing_id,
      metadata_json: body.metadata_json,
    });

    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ error: "Failed to send message", details: error });
  }
});

router.post("/:id/messages/:messageId/attachments", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      attachment_type?: string;
      url?: string;
      thumbnail_url?: string;
      size_bytes?: number;
    };

    if (!body.attachment_type || !body.url) {
      return res.status(400).json({ error: "attachment_type and url are required" });
    }

    const attachment = await messagingRepository.addAttachment({
      message_id: req.params.messageId,
      attachment_type: body.attachment_type as never,
      url: body.url,
      thumbnail_url: body.thumbnail_url,
      size_bytes: body.size_bytes,
    });

    return res.status(201).json(attachment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to add attachment", details: error });
  }
});

router.post("/:id/messages/:messageId/receipts", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const body = req.body as { status?: string };
    if (!userId || !body.status) {
      return res.status(400).json({ error: "userId and status are required" });
    }

    const receipt = await messagingRepository.markMessageReceipt(
      req.params.messageId,
      userId,
      body.status as never,
    );

    return res.json(receipt);
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark receipt", details: error });
  }
});

export default router;
