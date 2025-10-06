import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOrderForecastSchema, 
  insertGLEntrySchema,
  insertCustomerSchema,
  insertItemSchema,
  insertProjectSchema,
  insertAccountingItemSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Order Forecasts API
  app.get("/api/order-forecasts", async (req, res) => {
    try {
      const fiscalYear = parseInt(req.query.fiscalYear as string);
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const projectId = req.query.projectId as string | undefined;
      
      if (!fiscalYear || isNaN(fiscalYear)) {
        return res.status(400).json({ error: "fiscalYear is required and must be a number" });
      }
      
      const orderForecasts = await storage.getOrderForecasts({ 
        fiscalYear, 
        month, 
        projectId 
      });
      res.json(orderForecasts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order forecasts" });
    }
  });

  app.get("/api/order-forecasts/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const orderForecast = await storage.getOrderForecast(id);
      if (!orderForecast) {
        return res.status(404).json({ error: "Order forecast not found" });
      }
      res.json(orderForecast);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order forecast" });
    }
  });

  app.post("/api/order-forecasts", async (req, res) => {
    try {
      const validatedData = insertOrderForecastSchema.parse(req.body);
      const orderForecast = await storage.createOrderForecast(validatedData);
      res.status(201).json(orderForecast);
    } catch (error) {
      res.status(400).json({ error: "Invalid order forecast data" });
    }
  });

  app.put("/api/order-forecasts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateOrderForecast(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Order forecast not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order forecast" });
    }
  });

  app.delete("/api/order-forecasts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteOrderForecast(id);
      if (!success) {
        return res.status(404).json({ error: "Order forecast not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order forecast" });
    }
  });

  // GL Entries API
  app.get("/api/gl-entries", async (req, res) => {
    try {
      const fiscalYear = parseInt(req.query.fiscalYear as string);
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      
      if (!fiscalYear || isNaN(fiscalYear)) {
        return res.status(400).json({ error: "fiscalYear is required and must be a number" });
      }
      
      const glEntries = await storage.getGLEntries({ 
        fiscalYear, 
        month 
      });
      res.json(glEntries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GL entries" });
    }
  });

  app.get("/api/gl-entries/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const glEntry = await storage.getGLEntry(id);
      if (!glEntry) {
        return res.status(404).json({ error: "GL entry not found" });
      }
      res.json(glEntry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GL entry" });
    }
  });

  app.post("/api/gl-entries", async (req, res) => {
    try {
      const validatedData = insertGLEntrySchema.parse(req.body);
      const glEntry = await storage.createGLEntry(validatedData);
      res.status(201).json(glEntry);
    } catch (error) {
      res.status(400).json({ error: "Invalid GL entry data" });
    }
  });

  app.put("/api/gl-entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateGLEntry(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "GL entry not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update GL entry" });
    }
  });

  app.delete("/api/gl-entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteGLEntry(id);
      if (!success) {
        return res.status(404).json({ error: "GL entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete GL entry" });
    }
  });

  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validatedData);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ error: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomer(id);
      if (!success) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  app.post("/api/customers/import", async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid data format. Expected array." });
      }
      
      const validatedData = data.map(item => insertCustomerSchema.parse(item));
      const customers = await storage.bulkCreateCustomers(validatedData);
      res.status(201).json({ 
        success: true, 
        count: customers.length,
        customers 
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid CSV data" });
    }
  });

  // Items API
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const validatedData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid item data" });
    }
  });

  // Projects API
  app.get("/api/projects", async (req, res) => {
    try {
      const { fiscalYear } = req.query;
      const year = fiscalYear ? parseInt(fiscalYear as string) : undefined;
      const projects = await storage.getProjects(year);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.post("/api/projects/copy-from-previous-year", async (req, res) => {
    try {
      const { targetYear } = req.body;
      if (!targetYear || typeof targetYear !== 'number') {
        return res.status(400).json({ error: "Target year is required" });
      }
      const copiedProjects = await storage.copyProjectsFromPreviousYear(targetYear);
      res.status(201).json({ 
        success: true, 
        count: copiedProjects.length,
        projects: copiedProjects 
      });
    } catch (error) {
      res.status(400).json({ error: "Failed to copy projects" });
    }
  });

  // Accounting Items API
  app.get("/api/accounting-items", async (req, res) => {
    try {
      const accountingItems = await storage.getAccountingItems();
      res.json(accountingItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounting items" });
    }
  });

  app.get("/api/accounting-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const accountingItem = await storage.getAccountingItem(id);
      if (!accountingItem) {
        return res.status(404).json({ error: "Accounting item not found" });
      }
      res.json(accountingItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch accounting item" });
    }
  });

  app.post("/api/accounting-items", async (req, res) => {
    try {
      const validatedData = insertAccountingItemSchema.parse(req.body);
      const accountingItem = await storage.createAccountingItem(validatedData);
      res.status(201).json(accountingItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid accounting item data" });
    }
  });

  // Reconciliation API
  app.post("/api/reconciliation/:period", async (req, res) => {
    try {
      const { period } = req.params;
      const { type = "exact" } = req.body; // exact | fuzzy

      const orderForecasts = await storage.getOrderForecasts(period);
      const glEntries = await storage.getGLEntries(period);

      let matchedCount = 0;
      let fuzzyMatchedCount = 0;

      // Reconciliation logic
      for (const order of orderForecasts) {
        if (order.reconciliationStatus !== "unmatched") continue;

        let matched = false;

        // Exact matching (amount and accounting period match)
        if (type === "exact" || type === "both") {
          const matchedGL = glEntries.find(
            (gl) =>
              gl.reconciliationStatus === "unmatched" &&
              gl.amount === order.amount &&
              gl.period === order.accountingPeriod
          );

          if (matchedGL) {
            await storage.updateOrderForecast(order.id, {
              reconciliationStatus: "matched",
              glMatchId: matchedGL.id,
            });
            await storage.updateGLEntry(matchedGL.id, {
              reconciliationStatus: "matched",
              orderMatchId: order.id,
            });
            matchedCount++;
            matched = true;
            continue;
          }
        }

        // Fuzzy matching (amount match only)
        if (!matched && (type === "fuzzy" || type === "both")) {
          const fuzzyGL = glEntries.find((gl) => {
            if (gl.reconciliationStatus !== "unmatched") return false;
            if (gl.amount !== order.amount) return false;
            return true;
          });

          if (fuzzyGL) {
            await storage.updateOrderForecast(order.id, {
              reconciliationStatus: "fuzzy",
              glMatchId: fuzzyGL.id,
            });
            await storage.updateGLEntry(fuzzyGL.id, {
              reconciliationStatus: "fuzzy",
              orderMatchId: order.id,
            });
            fuzzyMatchedCount++;
          }
        }
      }

      // Get updated data
      const updatedOrders = await storage.getOrderForecasts(period);
      const updatedGL = await storage.getGLEntries(period);

      const totalMatched = updatedOrders.filter((o) => o.reconciliationStatus === "matched").length;
      const totalFuzzy = updatedOrders.filter((o) => o.reconciliationStatus === "fuzzy").length;
      const totalUnmatched = updatedOrders.filter((o) => o.reconciliationStatus === "unmatched").length;
      const unmatchedGL = updatedGL.filter((g) => g.reconciliationStatus === "unmatched").length;

      // Create reconciliation log
      await storage.createReconciliationLog({
        period,
        executedAt: new Date(),
        matchedCount: totalMatched,
        fuzzyMatchedCount: totalFuzzy,
        unmatchedOrderCount: totalUnmatched,
        unmatchedGlCount: unmatchedGL,
        totalOrderCount: updatedOrders.length,
        totalGlCount: updatedGL.length,
      });

      res.json({
        success: true,
        matchedCount,
        fuzzyMatchedCount,
        totalMatched,
        totalFuzzy,
        totalUnmatched,
        unmatchedGL,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform reconciliation" });
    }
  });

  // Reconciliation logs
  app.get("/api/reconciliation-logs/:period?", async (req, res) => {
    try {
      const { period } = req.params;
      const logs = await storage.getReconciliationLogs(period);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reconciliation logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
