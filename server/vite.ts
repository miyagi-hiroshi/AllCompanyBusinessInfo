import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await import("vite");
  const viteDevServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  app.use(viteDevServer.middlewares);
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientPath = path.resolve(import.meta.dirname, "..", "client");
      let template = fs.readFileSync(
        path.resolve(clientPath, "index.html"),
        "utf-8",
      );

      template = await viteDevServer.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(template);
    } catch (e) {
      viteDevServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

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
