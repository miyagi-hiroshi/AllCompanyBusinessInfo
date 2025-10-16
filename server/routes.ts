import type { Express } from "express";
import { createServer, type Server } from "http";

import accountingItemsRoutes from "./routes/accountingItems";
import angleBForecastsRoutes from "./routes/angleBForecasts";
import auditRoutes from "./routes/audit";
import authRoutes from "./routes/auth";
import budgetsExpenseRoutes from "./routes/budgetsExpense";
import budgetsRevenueRoutes from "./routes/budgetsRevenue";
import budgetsTargetRoutes from "./routes/budgetsTarget";
import customersRoutes from "./routes/customers";
import dashboardRoutes from "./routes/dashboard";
import employeesRoutes from "./routes/employees";
import glEntriesRoutes from "./routes/glEntries";
import itemsRoutes from "./routes/items";
import orderForecastsRoutes from "./routes/orderForecasts";
import projectsRoutes from "./routes/projects";
import reconciliationRoutes from "./routes/reconciliation";
import staffingRoutes from "./routes/staffing";

export function registerRoutes(app: Express): Server {
  // Auth API
  app.use('/api/auth', authRoutes);

  // Audit Logs API
  app.use('/api/audit-logs', auditRoutes);

  // Business Data APIs
  app.use('/api/customers', customersRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/order-forecasts', orderForecastsRoutes);
  app.use('/api/angle-b-forecasts', angleBForecastsRoutes);
  app.use('/api/gl-entries', glEntriesRoutes);
  app.use('/api/reconciliation', reconciliationRoutes);
  app.use('/api/accounting-items', accountingItemsRoutes);
  app.use('/api/items', itemsRoutes);
  app.use('/api/budgets/revenue', budgetsRevenueRoutes);
  app.use('/api/budgets/expense', budgetsExpenseRoutes);
  app.use('/api/budgets/target', budgetsTargetRoutes);
  app.use('/api/staffing', staffingRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  
  // Existing System Data APIs
  app.use('/api/employees', employeesRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
