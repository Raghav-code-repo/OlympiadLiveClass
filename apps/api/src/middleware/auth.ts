import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { Role, TokenUserPayload } from "@repo/shared";
import { prisma } from "@repo/db";

export interface AuthenticatedRequest extends Request {
  user?: TokenUserPayload;
}

export function generateAccessToken(payload: TokenUserPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: "15m",
  });
}

export function generateRefreshToken(payload: TokenUserPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: "7d",
  });
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    const decoded = jwt.verify(
      token,
      config.jwt.accessSecret
    ) as TokenUserPayload;

    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] permissions`,
      });
      return;
    }

    next();
  };
}
