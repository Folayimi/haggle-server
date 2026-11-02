import { Router, type Request, type Response } from "express";
import { negotiationRepository } from "../storage";
import { getBearerUserId } from "./http";

const router = Router();

const actor = (req: Request, res: Response) => {
  const userId = getBearerUserId(req);
  if (!userId) res.status(401).json({ error: "Invalid or expired token" });
  return userId;
};

const failure = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : "Offer action failed";
  const status = message.includes("not found") ? 404 :
    message.includes("Only") ? 403 :
    message.includes("expired") || message.includes("already") ? 409 : 400;
  return res.status(status).json({ error: message });
};

router.post("/:id/counter", async (req: Request, res: Response) => {
  try {
    const userId = actor(req, res);
    if (!userId) return;
    const body = req.body as { amount?: string | number; currency?: string };
    if (body.amount === undefined || !body.currency) {
      return res.status(400).json({ error: "amount and currency are required" });
    }
    return res.status(201).json(
      await negotiationRepository.counterNegotiationOffer(
        req.params.id,
        userId,
        String(body.amount),
        body.currency,
      ),
    );
  } catch (error) {
    return failure(res, error);
  }
});

router.post("/:id/accept", async (req: Request, res: Response) => {
  try {
    const userId = actor(req, res);
    if (!userId) return;
    return res.json(await negotiationRepository.acceptNegotiationOffer(req.params.id, userId));
  } catch (error) {
    return failure(res, error);
  }
});

router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const userId = actor(req, res);
    if (!userId) return;
    return res.json(await negotiationRepository.rejectNegotiationOffer(req.params.id, userId));
  } catch (error) {
    return failure(res, error);
  }
});

router.post("/:id/withdraw", async (req: Request, res: Response) => {
  try {
    const userId = actor(req, res);
    if (!userId) return;
    return res.json(await negotiationRepository.withdrawNegotiationOffer(req.params.id, userId));
  } catch (error) {
    return failure(res, error);
  }
});

export default router;
