import cookieParser from "cookie-parser";
import express from "express";

import { auditDataChanges } from "./middleware/auditMiddleware";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { setupSecurityMiddleware } from "./middleware/security";
import { registerRoutes } from "./routes";
import { log,serveStatic, setupVite } from "./vite";

const app = express();

// 本番環境ではリバースプロキシ（Nginx/Cloudflare）を信頼
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // 最初のプロキシを信頼
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 監査ログミドルウェア
app.use(auditDataChanges);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse !== undefined) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          logLine += ` :: [non-serializable response]`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

void (async () => {
  const server = registerRoutes(app);

  // セキュリティミドルウェアの設定
  setupSecurityMiddleware(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 404エラーハンドリング
  app.use(notFoundHandler);

  // 統一エラーハンドリング
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const isWindows = process.platform === 'win32';
  
  const listenOptions = isWindows 
    ? { port, host: "localhost" }
    : { port, host: "0.0.0.0", reusePort: true };
    
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
