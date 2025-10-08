import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
// import { nanoid } from "nanoid"; // 未使用のためコメントアウト
import path from "path";

// import { createServer as createViteServer } from "vite";
// import viteConfig from "../vite.config"; // 未使用のためコメントアウト

// const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(_app: Express, _server: Server) {
  // Vite integration temporarily disabled due to type issues
  console.log("Vite setup skipped due to type issues");
  return;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
