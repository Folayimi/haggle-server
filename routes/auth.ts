import { Router, type Request, type Response } from "express";
import { authRepository } from "../storage";

const router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      display_name?: string;
      username?: string;
      primary_role?: string;
      status?: string;
      email?: string;
      phone_e164?: string;
      password_hash?: string;
      provider?: string;
      provider_uid?: string;
      avatar_url?: string;
      bio?: string;
      country_code?: string;
      city?: string;
      response_time_label?: string;
    };

    if (!body.display_name || !body.username) {
      return res
        .status(400)
        .json({ error: "display_name and username are required" });
    }

    const user = await authRepository.createUserAccount({
      display_name: body.display_name,
      username: body.username,
      primary_role: body.primary_role as never,
      status: body.status as never,
      email: body.email,
      phone_e164: body.phone_e164,
      password_hash: body.password_hash,
      provider: body.provider as never,
      provider_uid: body.provider_uid,
      avatar_url: body.avatar_url,
      bio: body.bio,
      country_code: body.country_code,
      city: body.city,
      response_time_label: body.response_time_label,
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create user account", details: error });
  }
});

router.post("/otp", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      user_id?: string;
      channel?: string;
      purpose?: string;
      target?: string;
      code_hash?: string;
      expires_at?: string;
    };

    if (!body.channel || !body.purpose || !body.target || !body.code_hash || !body.expires_at) {
      return res.status(400).json({
        error: "channel, purpose, target, code_hash, and expires_at are required",
      });
    }

    const otp = await authRepository.createOtp({
      user_id: body.user_id,
      channel: body.channel as never,
      purpose: body.purpose as never,
      target: body.target,
      code_hash: body.code_hash,
      expires_at: new Date(body.expires_at),
    });

    return res.status(201).json(otp);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create OTP", details: error });
  }
});

router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      user_id?: string;
      refresh_token_hash?: string;
      device_name?: string;
      platform?: string;
      ip_address?: string;
      user_agent?: string;
      expires_at?: string;
    };

    if (!body.user_id || !body.refresh_token_hash || !body.expires_at) {
      return res.status(400).json({
        error: "user_id, refresh_token_hash, and expires_at are required",
      });
    }

    const session = await authRepository.createUserSession({
      user_id: body.user_id,
      refresh_token_hash: body.refresh_token_hash,
      device_name: body.device_name,
      platform: body.platform,
      ip_address: body.ip_address,
      user_agent: body.user_agent,
      expires_at: new Date(body.expires_at),
    });

    return res.status(201).json(session);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create session", details: error });
  }
});

export default router;
