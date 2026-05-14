import { Router, type Request, type Response } from "express";
import { authRepository } from "../storage";
import bcrypt from "bcrypt";

const router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      full_name?: string;
      username?: string;
      primary_role?: string;
      status?: string;
      email?: string;
      phone_e164?: string;
      password?: string;
      provider?: string;
      provider_uid?: string;
      avatar_url?: string;
      bio?: string;
      country_code?: string;
      city?: string;
      response_time_label?: string;
    };

    if (!body.full_name || !body.email || !body.password) {
      return res
        .status(400)
        .json({ error: "full_name, email, and password are required" });
    }

    console.log("Creating user account with data:", body);

    const phoneOrEmailExists = await authRepository.checkPhoneOrEmailExists(
      body.email,
      // body.phone_e164,
    );

    if (phoneOrEmailExists) {
      return res.status(409).json({ error: phoneOrEmailExists });
    } else {
      console.log("No existing user with provided email or phone");
    }

    const user = await authRepository.createUserAccount({
      full_name: body.full_name,
      username: body.username ? body.username : body.email.split("@")[0],
      primary_role: body.primary_role as never,
      status: body.status as never,
      email: body.email,
      phone_e164: body.phone_e164,
      password_hash:
        body.password && body.password.length > 0
          ? await bcrypt.hash(body.password, 10)
          : undefined,
      provider: body.provider as never,
      provider_uid: body.provider_uid,
      avatar_url: body.avatar_url,
      bio: body.bio,
      country_code: body.country_code,
      city: body.city,
      response_time_label: body.response_time_label,
    });

    console.log("Created user account:", user);

    return res.status(201).json({
      ...user,
      message: "User account created successfully",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create user account", details: error });
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

    if (
      !body.channel ||
      !body.purpose ||
      !body.target ||
      !body.code_hash ||
      !body.expires_at
    ) {
      return res.status(400).json({
        error:
          "channel, purpose, target, code_hash, and expires_at are required",
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
    return res
      .status(500)
      .json({ error: "Failed to create OTP", details: error });
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
    return res
      .status(500)
      .json({ error: "Failed to create session", details: error });
  }
});

export default router;
