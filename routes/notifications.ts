import { Router, type Request, type Response } from "express";
import { notificationsRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const notifications = await notificationsRepository.listForUser(userId);
    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch notifications", details: error });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const notification = await notificationsRepository.createNotification(req.body);
    return res.status(201).json(notification);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create notification", details: error });
  }
});

router.post("/:id/read", async (req: Request, res: Response) => {
  try {
    const notification = await notificationsRepository.markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ error: "Failed to mark notification as read", details: error });
  }
});

router.post("/:id/deliveries", async (req: Request, res: Response) => {
  try {
    const delivery = await notificationsRepository.createDelivery({
      notification_id: req.params.id,
      ...req.body,
    });

    return res.status(201).json(delivery);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create notification delivery", details: error });
  }
});

export default router;
