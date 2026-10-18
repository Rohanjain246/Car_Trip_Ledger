import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import User from "./models/User.js";
import {
  clearSessionCookie,
  publicUser,
  requireAdmin,
  requireAuth,
  setSessionCookie,
} from "./auth.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

function validEmail(email) {
  return typeof email === "string"
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/register", authLimiter, async (request, response, next) => {
  try {
    const { name, email, password } = request.body ?? {};
    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
      return response.status(400).json({ error: "Enter a name between 1 and 100 characters." });
    }
    if (!validEmail(email)) {
      return response.status(400).json({ error: "Enter a valid email address." });
    }
    if (typeof password !== "string" || password.length < 12
      || Buffer.byteLength(password, "utf8") > 72) {
      return response.status(400).json({ error: "Password must be at least 12 characters and no more than 72 bytes." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user",
    });
    setSessionCookie(response, user.id);
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ error: "An account with that email already exists." });
    }
    return next(error);
  }
});

router.post("/auth/login", authLimiter, async (request, response, next) => {
  try {
    const { email, password } = request.body ?? {};
    if (!validEmail(email) || typeof password !== "string" || password.length > 72) {
      return response.status(400).json({ error: "Enter a valid email address and password." });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    setSessionCookie(response, user.id);
    return response.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ ok: true });
});

router.get("/auth/me", requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

router.get("/admin/users", requireAuth, requireAdmin, async (_request, response, next) => {
  try {
    const [users, total] = await Promise.all([
      User.find().select("name email role createdAt").sort({ createdAt: -1 }).limit(1000),
      User.countDocuments(),
    ]);
    return response.json({ users: users.map(publicUser), total });
  } catch (error) {
    return next(error);
  }
});

export default router;
