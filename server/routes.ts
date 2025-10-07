import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth";
import authIntegratedRoutes from "./routes/authIntegrated";
import auditRoutes from "./routes/audit";
import customersRoutes from "./routes/customers";
import projectsRoutes from "./routes/projects";
import orderForecastsRoutes from "./routes/orderForecasts";
import glEntriesRoutes from "./routes/glEntries";
import reconciliationRoutes from "./routes/reconciliation";
import accountingItemsRoutes from "./routes/accountingItems";
import itemsRoutes from "./routes/items";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth API (Mock)
  app.use('/api/auth', authRoutes);

  // Auth API (Integrated with existing system)
  app.use('/api/auth-integrated', authIntegratedRoutes);

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
