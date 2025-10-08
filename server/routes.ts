import type { Express } from "express";
import { createServer, type Server } from "http";

import accountingItemsRoutes from "./routes/accountingItems";
import auditRoutes from "./routes/audit";
import authRoutes from "./routes/auth";
import customersRoutes from "./routes/customers";
import glEntriesRoutes from "./routes/glEntries";
import itemsRoutes from "./routes/items";
import orderForecastsRoutes from "./routes/orderForecasts";
import projectsRoutes from "./routes/projects";
import reconciliationRoutes from "./routes/reconciliation";

export function registerRoutes(app: Express): Server {
  // Auth API
  app.use('/api/auth', authRoutes);

  // Audit Logs API
  app.use('/api/audit-logs', auditRoutes);

  // Business Data APIs
  app.use('/api/customers', customersRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/order-forecasts', orderForecastsRoutes);
  app.use('/api/gl-entries', glEntriesRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);
  app.use('/api/accounting-items', accountingItemsRoutes);
  app.use('/api/items', itemsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
