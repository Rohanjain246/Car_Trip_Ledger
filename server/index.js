import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import routes from "./routes.js";
import { getJwtSecret } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use("/api", (request, response, next) => {
  const origin = request.get("Origin");
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return response.status(403).json({ error: "Origin is not allowed." });
  }
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.vary("Origin");
  }
  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "600");
    return response.sendStatus(204);
  }
  return next();
});
app.use("/api", routes);
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API route not found." });
});
app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return response.status(400).json({ error: "Request body must contain valid JSON." });
  }
  console.error("API request failed:", error.message);
  return response.status(500).json({ error: "The server could not complete the request." });
});

async function start() {
  getJwtSecret();
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`DriveLog API listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Could not start DriveLog API:", error.message);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
