import { Router, type Request, type Response } from "express";
import { negotiationRepository, sessionsRepository } from "../storage";
import { getRequestUserId } from "./http";

const router = Router();

router.get("/feed", async (req: Request, res: Response) => {
  try {
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
    const feed = await sessionsRepository.getFeed(Number.isNaN(limit) ? 20 : limit);
    return res.json(feed);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch session feed", details: error });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      seller_id?: string;
      primary_listing_id?: string;
      title?: string;
      description?: string;
      status?: string;
      session_type?: string;
      room_atmosphere?: string;
      scheduled_start_at?: string;
      starting_price_amount?: string;
      reserve_price_amount?: string;
      instant_buy_price_amount?: string;
      min_increment_amount?: string;
      auto_accept_threshold_amount?: string;
      auto_decline_threshold_amount?: string;
      response_time_limit_seconds?: number;
      max_counteroffers?: number;
      thumbnail_url?: string;
      stream_playback_url?: string;
    };

    if (
      !body.seller_id ||
      !body.title ||
      !body.session_type ||
      !body.room_atmosphere ||
      !body.scheduled_start_at ||
      !body.starting_price_amount ||
      !body.min_increment_amount
    ) {
      return res.status(400).json({ error: "Missing required session fields" });
    }

    const session = await sessionsRepository.createSession({
      seller_id: body.seller_id,
      primary_listing_id: body.primary_listing_id,
      title: body.title,
      description: body.description,
      status: body.status as never,
      session_type: body.session_type as never,
      room_atmosphere: body.room_atmosphere as never,
      scheduled_start_at: new Date(body.scheduled_start_at),
      starting_price_amount: body.starting_price_amount,
      reserve_price_amount: body.reserve_price_amount,
      instant_buy_price_amount: body.instant_buy_price_amount,
      min_increment_amount: body.min_increment_amount,
      auto_accept_threshold_amount: body.auto_accept_threshold_amount,
      auto_decline_threshold_amount: body.auto_decline_threshold_amount,
      response_time_limit_seconds: body.response_time_limit_seconds,
      max_counteroffers: body.max_counteroffers,
      thumbnail_url: body.thumbnail_url,
      stream_playback_url: body.stream_playback_url,
    });

    return res.status(201).json(session);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create session", details: error });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const session = await sessionsRepository.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch session", details: error });
  }
});

router.put("/:id/start", async (req: Request, res: Response) => {
  try {
    const session = await sessionsRepository.startSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: "Failed to start session", details: error });
  }
});

router.put("/:id/end", async (req: Request, res: Response) => {
  try {
    const session = await sessionsRepository.endSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json(session);
  } catch (error) {
    return res.status(500).json({ error: "Failed to end session", details: error });
  }
});

router.post("/:id/join", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const body = req.body as { role?: string; join_source?: string };

    if (!userId || !body.role || !body.join_source) {
      return res.status(400).json({
        error: "x-user-id header or userId plus role and join_source are required",
      });
    }

    const participant = await sessionsRepository.joinSession({
      session_id: req.params.id,
      user_id: userId,
      role: body.role as never,
      join_source: body.join_source as never,
    });

    return res.status(201).json(participant);
  } catch (error) {
    return res.status(500).json({ error: "Failed to join session", details: error });
  }
});

router.post("/:id/offers", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      thread_id?: string;
      listing_id?: string;
      buyer_id?: string;
      seller_id?: string;
      sender_user_id?: string;
      amount?: string;
      currency?: string;
      offer_kind?: string;
      parent_offer_id?: string;
      expires_at?: string;
    };

    if (
      !body.listing_id ||
      !body.buyer_id ||
      !body.seller_id ||
      !body.sender_user_id ||
      !body.amount
    ) {
      return res.status(400).json({ error: "Missing required offer fields" });
    }

    const offer = await negotiationRepository.createOffer({
      session_id: req.params.id,
      thread_id: body.thread_id,
      listing_id: body.listing_id,
      buyer_id: body.buyer_id,
      seller_id: body.seller_id,
      sender_user_id: body.sender_user_id,
      amount: body.amount,
      currency: body.currency,
      offer_kind: body.offer_kind as never,
      parent_offer_id: body.parent_offer_id,
      expires_at: body.expires_at ? new Date(body.expires_at) : undefined,
    });

    return res.status(201).json(offer);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create offer", details: error });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await sessionsRepository.getSessionHistory(req.params.id);
    return res.json(history);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch session history", details: error });
  }
});

router.post("/:id/listings", async (req: Request, res: Response) => {
  try {
    const body = req.body as { listing_id?: string; sort_order?: number; is_primary?: boolean };
    if (!body.listing_id) {
      return res.status(400).json({ error: "listing_id is required" });
    }

    const sessionListing = await sessionsRepository.addSessionListing({
      session_id: req.params.id,
      listing_id: body.listing_id,
      sort_order: body.sort_order ?? 0,
      is_primary: body.is_primary ?? false,
    });

    return res.status(201).json(sessionListing);
  } catch (error) {
    return res.status(500).json({ error: "Failed to attach listing to session", details: error });
  }
});

router.post("/:id/media", async (req: Request, res: Response) => {
  try {
    const body = req.body as { asset_type?: string; url?: string; metadata_json?: unknown };
    if (!body.asset_type || !body.url) {
      return res.status(400).json({ error: "asset_type and url are required" });
    }

    const asset = await sessionsRepository.addMediaAsset({
      session_id: req.params.id,
      asset_type: body.asset_type as never,
      url: body.url,
      metadata_json: body.metadata_json,
    });

    return res.status(201).json(asset);
  } catch (error) {
    return res.status(500).json({ error: "Failed to add media asset", details: error });
  }
});

router.post("/:id/reminders", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const body = req.body as { remind_at?: string; status?: string };

    if (!userId || !body.remind_at) {
      return res.status(400).json({ error: "userId and remind_at are required" });
    }

    const reminder = await sessionsRepository.createReminder({
      user_id: userId,
      session_id: req.params.id,
      remind_at: new Date(body.remind_at),
      status: body.status as never,
    });

    return res.status(201).json(reminder);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create reminder", details: error });
  }
});

router.post("/:id/impressions", async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const body = req.body as {
      listing_id?: string;
      impression_type?: string;
      watch_ms?: number;
    };

    if (!body.impression_type) {
      return res.status(400).json({ error: "impression_type is required" });
    }

    const impression = await sessionsRepository.trackImpression({
      user_id: userId,
      session_id: req.params.id,
      listing_id: body.listing_id,
      impression_type: body.impression_type as never,
      watch_ms: body.watch_ms,
    });

    return res.status(201).json(impression);
  } catch (error) {
    return res.status(500).json({ error: "Failed to track impression", details: error });
  }
});

export default router;
