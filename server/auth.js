import jwt from "jsonwebtoken";
import User from "./models/User.js";

const cookieName = "drivelog_session";
const sessionDurationSeconds = 60 * 60 * 8;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    path: "/api",
  };
}

export function setSessionCookie(response, userId) {
  const token = jwt.sign(
    { sub: userId.toString() },
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: sessionDurationSeconds },
  );
  response.cookie(cookieName, token, {
    ...cookieOptions(),
    maxAge: sessionDurationSeconds * 1000,
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(cookieName, cookieOptions());
}

export async function requireAuth(request, response, next) {
  const token = request.cookies?.[cookieName];
  if (!token) {
    return response.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return response.status(401).json({ error: "Authentication required." });
    }
    const user = await User.findById(payload.sub).select("name email role createdAt");
    if (!user) {
      return response.status(401).json({ error: "Authentication required." });
    }
    request.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ error: "Authentication required." });
    }
    return next(error);
  }
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") {
    return response.status(403).json({ error: "Administrator access required." });
  }
  return next();
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
