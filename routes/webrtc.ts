import { Router, type Request, type Response } from "express";
import { webrtcRepository } from "../storage";

const router = Router();

router.post("/offer", async (req: Request, res: Response) => {
  try {
    const result = await webrtcRepository.registerOffer(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to register WebRTC offer", details: error });
  }
});

router.post("/answer", async (req: Request, res: Response) => {
  try {
    const result = await webrtcRepository.registerAnswer(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to register WebRTC answer", details: error });
  }
});

router.post("/ice-candidate", async (req: Request, res: Response) => {
  try {
    const result = await webrtcRepository.registerIceCandidate(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to register ICE candidate",
      details: error,
    });
  }
});

export default router;
