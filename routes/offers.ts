import { Router, type Request, type Response } from "express";
import { negotiationRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.put("/:id/accept", async (req: Request, res: Response) => {
  try {
    const actorUserId = getRequestUserId(req);
    const thread = await negotiationRepository.acceptOffer(req.params.id, actorUserId);
    if (!thread) {
      return res.status(404).json({ error: "Offer not found" });
    }

    return res.json(thread);
  } catch (error) {
    return res.status(500).json({ error: "Failed to accept offer", details: error });
  }
});

router.put("/:id/counter", async (req: Request, res: Response) => {
  try {
    const senderUserId = getRequestUserId(req);
    const body = req.body as { amount?: string; currency?: string };

    if (!senderUserId || !body.amount) {
      return res.status(400).json({ error: "userId and amount are required" });
    }

    const offer = await negotiationRepository.counterOffer(req.params.id, {
      sender_user_id: senderUserId,
      amount: body.amount,
      currency: body.currency,
    });

    return res.json(offer);
  } catch (error) {
    return res.status(500).json({ error: "Failed to counter offer", details: error });
  }
});

router.put("/:id/reject", async (req: Request, res: Response) => {
  try {
    const actorUserId = getRequestUserId(req);
    const thread = await negotiationRepository.rejectOffer(req.params.id, actorUserId);
    if (!thread) {
      return res.status(404).json({ error: "Offer not found" });
    }

    return res.json(thread);
  } catch (error) {
    return res.status(500).json({ error: "Failed to reject offer", details: error });
  }
});

export default router;
