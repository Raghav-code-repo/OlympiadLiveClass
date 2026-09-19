import { Router, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  TokenUserPayload,
  Role,
} from "@repo/shared";
import { validateBody } from "../middleware/validate";
import {
  authenticate,
  AuthenticatedRequest,
  generateAccessToken,
  generateRefreshToken,
} from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";
import { config } from "../config";

const router = Router();

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = config.nodeEnv === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 mins
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response) {
  const isProduction = config.nodeEnv === "production";
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
}

// Register
router.post(
  "/register",
  authLimiter,
  validateBody(RegisterRequestSchema),
  async (req, res): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ error: "Email is already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: role || "STUDENT",
          isEmailVerified: false,
        },
      });

      // Auto-enroll new students in the default batch so they can see classes
      if (role === "STUDENT" || role === "student") {
        const defaultBatch = await prisma.batch.findFirst({
          orderBy: { createdAt: "asc" },
        });
        if (defaultBatch) {
          await prisma.batchEnrollment.create({
            data: {
              userId: user.id,
              batchId: defaultBatch.id,
              status: "ACTIVE",
              approvedById: user.id,
              approvedAt: new Date(),
            },
          });
        }
      }

      const tokenPayload: TokenUserPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Internal server error during registration" });
    }
  }
);

// Login
router.post(
  "/login",
  authLimiter,
  validateBody(LoginRequestSchema),
  async (req, res): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const tokenPayload: TokenUserPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        accessToken,
        refreshToken,
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error during login" });
    }
  }
);

// Refresh token rotation
router.post("/refresh", async (req, res): Promise<void> => {
  try {
    const rawToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      res.status(401).json({ error: "Refresh token is missing" });
      return;
    }

    let decoded: TokenUserPayload;
    try {
      decoded = jwt.verify(
        rawToken,
        config.jwt.refreshSecret
      ) as TokenUserPayload;
    } catch {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    // Lookup token in DB for rotation & revocation tracking
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: rawToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      clearAuthCookies(res);
      res.status(401).json({ error: "Refresh token has expired or was revoked" });
      return;
    }

    // Delete old token (rotate)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newPayload: TokenUserPayload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      name: storedToken.user.name,
      role: storedToken.user.role as Role,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: newExpiresAt,
      },
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
        isEmailVerified: storedToken.user.isEmailVerified,
      },
    });
  } catch (err: any) {
    console.error("Refresh token error:", err);
    res.status(500).json({ error: "Internal server error during token refresh" });
  }
});

// Logout
router.post("/logout", async (req, res): Promise<void> => {
  try {
    const rawToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: rawToken },
      });
    }

    clearAuthCookies(res);
    res.json({ message: "Successfully logged out" });
  } catch (err: any) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error during logout" });
  }
});

// Current user
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }
);

// Email verification stub
router.post(
  "/verify-email-stub",
  authenticate,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { isEmailVerified: true },
      });
      res.json({ message: "Email verified successfully (stub)" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to verify email" });
    }
  }
);

export default router;
