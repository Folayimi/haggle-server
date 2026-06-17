import { Router, type Request, type Response } from "express";
import { authRepository } from "../storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  generateTokens,
  revokeAllUserSessions,
  verifyAccessToken,
  generateResetToken,
  createUserSession,
  verifyUserRefreshToken,
  createAuthSession,
  revokeUserSession,
} from "../services/tokenService";
import { sendAppOtpEmail, sendWebVerificationEmail } from "../services/email";
import {
  buildVerificationUrl,
  EMAIL_VERIFICATION_EXPIRY_MINUTES,
  generateSixDigitOtp,
  generateVerificationJwt,
  getRateLimitWindowMs,
  getVerificationExpiryDate,
  verifyVerificationJwt,
} from "../services/emailVerification";
import { EmailVerificationType } from "../src/db/schema";
import { error } from "console";

const router = Router();
const MAX_VERIFICATION_REQUESTS_PER_WINDOW = 3;

const sendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

const verifyWebSchema = z.object({
  token: z.string().trim().min(1),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp_code: z.string().regex(/^\d{6}$/),
  token: z.string().trim().min(1),
});

const getValidationErrorResponse = (error: z.ZodError) =>
  error.issues.map((issue) => issue.message).join(", ");

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      full_name: string;
      username?: string;
      primary_role?: string;
      status?: string;
      email?: string;
      phone_e164?: string;
      password: string;
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
      phone_e164: body.phone_e164 ? body.phone_e164 : "",
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

    // Create session in database

    await authRepository.sendVerificationOTP(
      body?.email,
      MAX_VERIFICATION_REQUESTS_PER_WINDOW,
      res,
    );

    // Generate tokens for the new user
    const { accessToken, refreshToken } = generateTokens(
      user?.profile?.user_id ?? "",
    );

    await createAuthSession(user?.profile?.user_id ?? "", refreshToken);

    return res.status(201).json({
      ...user,
      tokens: {
        accessToken,
        refreshToken,
      },
      message: "Verificaition Code sent to your email",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to create user account", details: error });
  }
});

// LOGIN ROUTE
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      email?: string;
      password?: string;
      device_name?: string;
      platform?: string;
    };

    // Validate required fields
    if (!body.email || !body.password) {
      return res.status(400).json({
        error: "email and password are required",
      });
    }

    // Find user by email
    const user = await authRepository.findUserByEmail(body.email);

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Check if user has a password (for OAuth users, they might not have one)
    if (!user.password_hash) {
      return res.status(401).json({
        error:
          "This account uses social login. Please sign in with your provider.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      body.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.user_id);

    // Create session in database
    const session = await createUserSession(user.user_id, refreshToken);

    // If you want to track device info, update the session with device details
    // if (body.device_name || body.platform) {
    //   // You can add this functionality to your tokenService
    //   await authRepository.updateUserSession(session.id, {
    //     device_name: body.device_name,
    //     platform: body.platform,
    //     ip_address: req.ip || req.socket.remoteAddress,
    //     user_agent: req.headers["user-agent"],
    //   });
    // }

    // Return user data and tokens
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Failed to login",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

// REFRESH TOKEN ROUTE
router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      refreshToken?: string;
    };

    if (!body.refreshToken) {
      return res.status(400).json({
        error: "refreshToken is required",
      });
    }

    // Verify refresh token and get user info
    const { userId, sessionId } = await verifyUserRefreshToken(
      body.refreshToken,
    );

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(userId);

    // Revoke old session and create new one
    await revokeUserSession(body.refreshToken);
    await createUserSession(userId, newRefreshToken);

    return res.status(200).json({
      success: true,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({
      error: "Invalid or expired refresh token",
    });
  }
});

// LOGOUT ROUTE
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      refreshToken?: string;
    };

    if (!body.refreshToken) {
      return res.status(400).json({
        error: "refreshToken is required",
      });
    }

    // Revoke the session
    await revokeUserSession(body.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      error: "Failed to logout",
    });
  }
});

// LOGOUT FROM ALL DEVICES
router.post("/logout-all", async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      userId?: string;
    };

    if (!body.userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    // Revoke all user sessions
    await revokeAllUserSessions(body.userId);

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    return res.status(500).json({
      error: "Failed to logout from all devices",
    });
  }
});

// GET CURRENT USER (Protected route example)
router.get("/me", async (req: Request, res: Response) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify access token
    try {
      const decoded = verifyAccessToken(token);
      // Get user data
      const user = await authRepository.findUserById(decoded.userId);

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        ...user,
      });
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error: "Failed to get user data",
    });
  }
});

router.post("/verify-email", async (req: Request, res: Response) => {
  const parsedBody = sendVerificationSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: getValidationErrorResponse(parsedBody.error),
    });
  }

  const { email } = parsedBody.data;

  try {
    const identity =
      await authRepository.findPrimaryEmailIdentityByEmail(email);

    if (!identity) {
      return res.status(404).json({
        error: "No account found for this email",
      });
    }

    if (!identity.verified_at) {
      return res.status(400).json({
        error:
          "We Noticed this email hasn't been verified. Continue to verify and reset Account",
      });
    }

    const rateLimitWindowMs = getRateLimitWindowMs();
    const windowStart = new Date(Date.now() - rateLimitWindowMs);
    const recentRequests =
      await authRepository.countRecentEmailVerificationRequests(
        email,
        windowStart,
        "reset",
      );

    if (recentRequests >= MAX_VERIFICATION_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: "Too many verification requests. Please try again later.",
      });
    }

    const expiresAt = getVerificationExpiryDate();
    const verificationRecord =
      await authRepository.createResetEmailVerification({
        email,
        expires_at: expiresAt,
        otp_code: generateSixDigitOtp(),
        type: EmailVerificationType.APP_OTP,
        user_id: identity.user_id,
      });

    try {
      const supportEmail = process.env.EMAIL_USER ?? "";

      await sendAppOtpEmail({
        email,
        expiresInMinutes: EMAIL_VERIFICATION_EXPIRY_MINUTES,
        otpCode: verificationRecord.otp_code ?? "",
        supportEmail,
      });
    } catch (emailError) {
      await authRepository.deleteResetEmailVerification(verificationRecord.id);
      console.error("Failed to send verification email", {
        email,
        error: emailError,
      });

      return res.status(500).json({
        error: "Failed to send verification email",
      });
    }

    const { resetToken } = generateResetToken(identity.user_id);

    // Create session in database
    const session = await createAuthSession(identity.user_id, resetToken);

    return res.status(200).json({
      token: {
        resetToken: session.refreshToken,
      },
      message: "Reset OTP successfully sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Send verification error", { email, error });
    return res.status(500).json({
      error: "Failed to send verification email",
    });
  }
});

// router.post("/verify-web", async (req: Request, res: Response) => {
//   const parsedBody = verifyWebSchema.safeParse(req.body);

//   if (!parsedBody.success) {
//     return res.status(400).json({
//       error: getValidationErrorResponse(parsedBody.error),
//     });
//   }

//   const { token } = parsedBody.data;

//   try {
//     const payload = verifyVerificationJwt(token);
//     const verification =
//       await authRepository.findActiveWebVerificationByToken(token);

//     if (!verification || verification.expires_at <= new Date()) {
//       return res.status(400).json({
//         error: "Invalid or expired verification token",
//       });
//     }

//     if (
//       verification.user_id !== payload.sub ||
//       verification.email !== payload.email
//     ) {
//       return res.status(400).json({
//         error: "Invalid verification token",
//       });
//     }

//     const markedVerification =
//       await authRepository.markEmailVerificationVerified(verification.id);

//     if (!markedVerification) {
//       return res.status(400).json({
//         error: "Verification token has already been used",
//       });
//     }

//     await authRepository.markEmailIdentityVerified(
//       verification.user_id,
//       verification.email,
//     );

//     return res.status(200).json({
//       message: "Email verified successfully",
//       success: true,
//     });
//   } catch (error) {
//     console.error("Verify web email error", { error });
//     return res.status(400).json({
//       error: "Invalid or expired verification token",
//     });
//   }
// });

router.post("/verify-otp", async (req: Request, res: Response) => {
  const parsedBody = verifyOtpSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: getValidationErrorResponse(parsedBody.error),
    });
  }

  const { email, otp_code: otpCode, token } = parsedBody.data;

  const verify = verifyAccessToken(token);

  const user = authRepository.findUserById(verify?.userId);

  if (!user) {
    return res.status(401).json({
      error: "UnAuthorized token used",
    });
  }

  if (!email || !otpCode) {
    return res.status(400).json({
      error: "email and otpCode is required!",
    });
  }

  try {
    const verification = await authRepository.findActiveOtpVerification(
      email,
      otpCode,
    );

    if (!verification || verification.expires_at <= new Date()) {
      return res.status(400).json({
        error: "Invalid or expired OTP",
      });
    }

    const markedVerification =
      await authRepository.markEmailVerificationVerified(verification.id);

    if (!markedVerification) {
      return res.status(400).json({
        error: "OTP has already been used",
      });
    }

    await authRepository.markEmailIdentityVerified(
      verification.user_id,
      verification.email,
    );

    return res.status(200).json({
      message: "Email verified! Your Account has been created.",
      success: true,
    });
  } catch (error) {
    console.error("Verify OTP error", { email, error });
    return res.status(500).json({
      error: "Failed to verify OTP",
    });
  }
});

router.post("/verify-reset-otp", async (req: Request, res: Response) => {
  const parsedBody = verifyOtpSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      error: getValidationErrorResponse(parsedBody.error),
    });
  }

  const { email, otp_code: otpCode, token } = parsedBody.data;

  const verify = verifyAccessToken(token);

  const user = authRepository.findUserById(verify?.userId);

  if (!user) {
    return res.status(401).json({
      error: "UnAuthorized token used",
    });
  }

  if (!email || !otpCode) {
    return res.status(400).json({
      error: "email and otpCode is required!",
    });
  }

  try {
    const verification = await authRepository.findActiveResetOtpVerification(
      email,
      otpCode,
    );

    if (!verification || verification.expires_at <= new Date()) {
      return res.status(400).json({
        error: "Invalid or expired OTP",
      });
    }

    const markedVerification =
      await authRepository.markResetEmailVerificationVerified(verification.id);

    if (!markedVerification) {
      return res.status(400).json({
        error: "OTP has already been used",
      });
    }

    return res.status(200).json({
      message: "Email verified!",
      success: true,
    });
  } catch (error) {
    console.error("Verify OTP error", { email, error });
    return res.status(500).json({
      error: "Failed to verify OTP",
    });
  }
});

// router.post("/sessions", async (req: Request, res: Response) => {
//   try {
//     const body = req.body as {
//       user_id?: string;
//       refresh_token_hash?: string;
//       device_name?: string;
//       platform?: string;
//       ip_address?: string;
//       user_agent?: string;
//       expires_at?: string;
//     };

//     if (!body.user_id || !body.refresh_token_hash || !body.expires_at) {
//       return res.status(400).json({
//         error: "user_id, refresh_token_hash, and expires_at are required",
//       });
//     }

//     const session = await authRepository.createUserSession({
//       user_id: body.user_id,
//       refresh_token_hash: body.refresh_token_hash,
//       device_name: body.device_name,
//       platform: body.platform,
//       ip_address: body.ip_address,
//       user_agent: body.user_agent,
//       expires_at: new Date(body.expires_at),
//     });

//     return res.status(201).json(session);
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ error: "Failed to create session", details: error });
//   }
// });

export default router;
