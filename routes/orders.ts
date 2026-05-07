import { Router, type Request, type Response } from "express";
import { commerceRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const orders = await commerceRepository.listOrdersForUser(userId);
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch orders", details: error });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const order = await commerceRepository.createOrder(req.body);
    return res.status(201).json(order);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create order", details: error });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await commerceRepository.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch order", details: error });
  }
});

router.post("/:id/payments", async (req: Request, res: Response) => {
  try {
    const payment = await commerceRepository.addPayment({
      order_id: req.params.id,
      ...req.body,
    });

    return res.status(201).json(payment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create payment", details: error });
  }
});

router.patch("/payments/:paymentId", async (req: Request, res: Response) => {
  try {
    const payment = await commerceRepository.updatePaymentStatus(
      req.params.paymentId,
      req.body,
    );

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json(payment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update payment", details: error });
  }
});

router.post("/:id/shipments", async (req: Request, res: Response) => {
  try {
    const shipment = await commerceRepository.addShipment({
      order_id: req.params.id,
      ...req.body,
    });

    return res.status(201).json(shipment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create shipment", details: error });
  }
});

router.patch("/shipments/:shipmentId", async (req: Request, res: Response) => {
  try {
    const shipment = await commerceRepository.updateShipmentStatus(
      req.params.shipmentId,
      req.body,
    );

    if (!shipment) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    return res.json(shipment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update shipment", details: error });
  }
});

router.post("/payouts", async (req: Request, res: Response) => {
  try {
    const payout = await commerceRepository.createPayout(req.body);
    return res.status(201).json(payout);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create payout", details: error });
  }
});

export default router;
