import { Router, type Request, type Response } from "express";
import { usersRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const user = await usersRepository.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch current user", details: error });
  }
});

router.put("/me", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const user = await usersRepository.updateCurrentUser(userId, req.body);
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update current user", details: error });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = await usersRepository.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user", details: error });
  }
});

router.get("/:id/ratings", async (req: Request, res: Response) => {
  try {
    const ratings = await usersRepository.getUserRatings(req.params.id);
    return res.json(ratings);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user ratings", details: error });
  }
});

router.post("/:id/follow", async (req: Request, res: Response) => {
  try {
    const followerId = getRequestUserId(req);
    if (!followerId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const follow = await usersRepository.followSeller(req.params.id, followerId);
    return res.status(201).json(follow);
  } catch (error) {
    return res.status(500).json({ error: "Failed to follow seller", details: error });
  }
});

router.delete("/:id/follow", async (req: Request, res: Response) => {
  try {
    const followerId = getRequestUserId(req);
    if (!followerId) {
      return res.status(400).json({ error: "x-user-id header or userId is required" });
    }

    const removed = await usersRepository.unfollowSeller(req.params.id, followerId);
    return res.json({ removed });
  } catch (error) {
    return res.status(500).json({ error: "Failed to unfollow seller", details: error });
  }
});

router.get("/:id/followers", async (req: Request, res: Response) => {
  try {
    const followers = await usersRepository.listFollowers(req.params.id);
    return res.json(followers);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch followers", details: error });
  }
});

router.get("/:id/addresses", async (req: Request, res: Response) => {
  try {
    const addresses = await usersRepository.listAddresses(req.params.id);
    return res.json(addresses);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch addresses", details: error });
  }
});

router.post("/:id/addresses", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      label?: string;
      recipient_name?: string;
      phone_e164?: string;
      country?: string;
      state?: string;
      city?: string;
      line_1?: string;
      line_2?: string;
      postal_code?: string;
      is_default?: boolean;
    };

    if (
      !body.label ||
      !body.recipient_name ||
      !body.phone_e164 ||
      !body.country ||
      !body.state ||
      !body.city ||
      !body.line_1 ||
      !body.postal_code
    ) {
      return res.status(400).json({ error: "Missing required address fields" });
    }

    const address = await usersRepository.createAddress({
      user_id: req.params.id,
      label: body.label,
      recipient_name: body.recipient_name,
      phone_e164: body.phone_e164,
      country: body.country,
      state: body.state,
      city: body.city,
      line_1: body.line_1,
      line_2: body.line_2,
      postal_code: body.postal_code,
      is_default: body.is_default,
    });

    return res.status(201).json(address);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create address", details: error });
  }
});

export default router;
