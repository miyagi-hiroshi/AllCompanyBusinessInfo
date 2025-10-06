import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOrderForecastSchema, 
  insertGLEntrySchema,
  insertCustomerSchema,
  insertItemSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Order Forecasts API
  app.get("/api/order-forecasts/:period", async (req, res) => {
    try {
      const { period } = req.params;
      const orderForecasts = await storage.getOrderForecasts(period);
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
  app.get("/api/gl-entries/:period", async (req, res) => {
    try {
      const { period } = req.params;
      const glEntries = await storage.getGLEntries(period);
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

        // Exact matching
        if (type === "exact" || type === "both") {
          const matchedGL = glEntries.find(
            (gl) =>
              gl.reconciliationStatus === "unmatched" &&
              gl.voucherNo === order.voucherNo &&
              gl.transactionDate === order.orderDate &&
              gl.amount === order.amount
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

        // Fuzzy matching (date ±3 days, amount match)
        if (!matched && (type === "fuzzy" || type === "both")) {
          const orderDate = new Date(order.orderDate);
          
          const fuzzyGL = glEntries.find((gl) => {
            if (gl.reconciliationStatus !== "unmatched") return false;
            if (gl.amount !== order.amount) return false;
            
            const glDate = new Date(gl.transactionDate);
            const diffDays = Math.abs((glDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 3;
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
