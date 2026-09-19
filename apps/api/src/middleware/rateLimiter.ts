import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests, please try again later" },
});

export const quizSubmitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit to 60 submits per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many quiz submissions, slow down" },
});
