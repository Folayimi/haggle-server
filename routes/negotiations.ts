import { Router, type Request, type Response } from "express";
import { negotiationRepository, messagingRepository } from "../storage";
import { getBearerUserId } from "./http";

const router = Router();

const auth = (req: Request, res: Response) => {
  const userId = getBearerUserId(req);
  if (!userId) res.status(401).json({ error: "Invalid or expired token" });
  return userId;
};

const handleError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : "Request failed";
  const status =
    message.includes("not found") ? 404 :
    message.includes("not authorized") || message.includes("participant") ? 403 :
    message.includes("expired") || message.includes("inactive") ||
    message.includes("already") || message.includes("cannot") ? 409 : 400;
  return res.status(status).json({ error: message });
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const buyerId = auth(req, res);
    if (!buyerId) return;
    const body = req.body as {
      conversation_id?: string;
      listing_id?: string;
      quantity?: number;
      variant_selection?: unknown;
    };
    if (!body.conversation_id || !body.listing_id || !body.quantity) {
      return res.status(400).json({
        error: "conversation_id, listing_id and quantity are required",
      });
    }
    if (!(await messagingRepository.isParticipant(body.conversation_id, buyerId))) {
      return res.status(403).json({ error: "You are not a conversation participant" });
    }
    const negotiation = await negotiationRepository.createNegotiation({
      conversation_id: body.conversation_id,
      listing_id: body.listing_id,
      buyer_id: buyerId,
      quantity: body.quantity,
      variant_selection: body.variant_selection,
    });
    return res.status(201).json(negotiation);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = auth(req, res);
    if (!userId) return;
    const negotiation = await negotiationRepository.getNegotiation(req.params.id);
    if (!negotiation) return res.status(404).json({ error: "Negotiation not found" });
    if (![negotiation.buyer_id, negotiation.seller_id].includes(userId)) {
      return res.status(403).json({ error: "User is not a negotiation participant" });
    }
    return res.json(negotiation);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/:id/offers", async (req: Request, res: Response) => {
  try {
    const userId = auth(req, res);
    if (!userId) return;
    const body = req.body as { amount?: string | number; currency?: string };
    if (body.amount === undefined || !body.currency) {
      return res.status(400).json({ error: "amount and currency are required" });
    }
    const offer = await negotiationRepository.submitNegotiationOffer(
      req.params.id,
      userId,
      String(body.amount),
      body.currency,
    );
    return res.status(201).json(offer);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id/offers", async (req: Request, res: Response) => {
  try {
    const userId = auth(req, res);
    if (!userId) return;
    const negotiation = await negotiationRepository.getNegotiation(req.params.id);
    if (!negotiation) return res.status(404).json({ error: "Negotiation not found" });
    if (![negotiation.buyer_id, negotiation.seller_id].includes(userId)) {
      return res.status(403).json({ error: "User is not a negotiation participant" });
    }
    return res.json(await negotiationRepository.listOffersForNegotiation(req.params.id));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get("/:id/deal", async (req: Request, res: Response) => {
  try {
    const userId = auth(req, res);
    if (!userId) return;
    const deal = await negotiationRepository.getDealForNegotiation(req.params.id, userId);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    return res.json(deal);
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
