import { Router, type Request, type Response } from "express";
import { trustRepository } from "../storage";

const router = Router();

router.post("/reviews", async (req: Request, res: Response) => {
  try {
    const review = await trustRepository.createReview(req.body);
    return res.status(201).json(review);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create review", details: error });
  }
});

router.post("/verifications", async (req: Request, res: Response) => {
  try {
    const submission = await trustRepository.createVerificationSubmission(req.body);
    return res.status(201).json(submission);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create verification submission",
      details: error,
    });
  }
});

router.post("/reports", async (req: Request, res: Response) => {
  try {
    const report = await trustRepository.createReport(req.body);
    return res.status(201).json(report);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create report", details: error });
  }
});

router.post("/blocks", async (req: Request, res: Response) => {
  try {
    const block = await trustRepository.createBlock(req.body);
    return res.status(201).json(block);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create block", details: error });
  }
});

export default router;
