import { 
  type OrderForecast, 
  type InsertOrderForecast,
  type GLEntry,
  type InsertGLEntry,
  type Customer,
  type InsertCustomer,
  type Item,
  type InsertItem,
  type ReconciliationLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface for the application
export interface IStorage {
  // Order Forecasts
  getOrderForecasts(period: string): Promise<OrderForecast[]>;
  getOrderForecast(id: string): Promise<OrderForecast | undefined>;
  createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast>;
  updateOrderForecast(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | undefined>;
  deleteOrderForecast(id: string): Promise<boolean>;

  // GL Entries
  getGLEntries(period: string): Promise<GLEntry[]>;
  getGLEntry(id: string): Promise<GLEntry | undefined>;
  createGLEntry(data: InsertGLEntry): Promise<GLEntry>;
  updateGLEntry(id: string, data: Partial<GLEntry>): Promise<GLEntry | undefined>;
  deleteGLEntry(id: string): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;

  // Items
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(data: InsertItem): Promise<Item>;

  // Reconciliation
  getReconciliationLogs(period?: string): Promise<ReconciliationLog[]>;
  createReconciliationLog(data: Omit<ReconciliationLog, "id">): Promise<ReconciliationLog>;
}

// In-memory storage implementation (for mock/demo purposes)
export class MemStorage implements IStorage {
  private orderForecasts: Map<string, OrderForecast>;
  private glEntries: Map<string, GLEntry>;
  private customers: Map<string, Customer>;
  private items: Map<string, Item>;
  private reconciliationLogs: Map<string, ReconciliationLog>;

  constructor() {
    this.orderForecasts = new Map();
    this.glEntries = new Map();
    this.customers = new Map();
    this.items = new Map();
    this.reconciliationLogs = new Map();
    
    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock customers
    const mockCustomers: Customer[] = [
      { id: "1", code: "C001", name: "株式会社A商事", createdAt: new Date() },
      { id: "2", code: "C002", name: "B物産株式会社", createdAt: new Date() },
      { id: "3", code: "C003", name: "C工業株式会社", createdAt: new Date() },
      { id: "4", code: "C004", name: "株式会社Dサービス", createdAt: new Date() },
      { id: "5", code: "C005", name: "E商事株式会社", createdAt: new Date() },
    ];
    mockCustomers.forEach(c => this.customers.set(c.id, c));

    // Mock items
    const mockItems: Item[] = [
      { id: "1", code: "I001", name: "製品A", createdAt: new Date() },
      { id: "2", code: "I002", name: "製品B", createdAt: new Date() },
      { id: "3", code: "I003", name: "製品C", createdAt: new Date() },
      { id: "4", code: "I004", name: "サービスD", createdAt: new Date() },
      { id: "5", code: "I005", name: "部品E", createdAt: new Date() },
    ];
    mockItems.forEach(i => this.items.set(i.id, i));
  }

  // Order Forecasts
  async getOrderForecasts(period: string): Promise<OrderForecast[]> {
    return Array.from(this.orderForecasts.values())
      .filter(o => o.period === period);
  }

  async getOrderForecast(id: string): Promise<OrderForecast | undefined> {
    return this.orderForecasts.get(id);
  }

  async createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast> {
    const id = randomUUID();
    const orderForecast: OrderForecast = {
      ...data,
      id,
      unitPrice: String(data.unitPrice),
      amount: String(data.amount),
      remarks: data.remarks ?? null,
      reconciliationStatus: "unmatched",
      glMatchId: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.orderForecasts.set(id, orderForecast);
    return orderForecast;
  }

  async updateOrderForecast(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | undefined> {
    const existing = this.orderForecasts.get(id);
    if (!existing) return undefined;

    const updated: OrderForecast = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      version: existing.version + 1,
    };
    this.orderForecasts.set(id, updated);
    return updated;
  }

  async deleteOrderForecast(id: string): Promise<boolean> {
    return this.orderForecasts.delete(id);
  }

  // GL Entries
  async getGLEntries(period: string): Promise<GLEntry[]> {
    return Array.from(this.glEntries.values())
      .filter(g => g.period === period);
  }

  async getGLEntry(id: string): Promise<GLEntry | undefined> {
    return this.glEntries.get(id);
  }

  async createGLEntry(data: InsertGLEntry): Promise<GLEntry> {
    const id = randomUUID();
    const glEntry: GLEntry = {
      ...data,
      id,
      amount: String(data.amount),
      description: data.description ?? null,
      reconciliationStatus: "unmatched",
      orderMatchId: null,
      createdAt: new Date(),
    };
    this.glEntries.set(id, glEntry);
    return glEntry;
  }

  async updateGLEntry(id: string, data: Partial<GLEntry>): Promise<GLEntry | undefined> {
    const existing = this.glEntries.get(id);
    if (!existing) return undefined;

    const updated: GLEntry = {
      ...existing,
      ...data,
    };
    this.glEntries.set(id, updated);
    return updated;
  }

  async deleteGLEntry(id: string): Promise<boolean> {
    return this.glEntries.delete(id);
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  // Items
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(data: InsertItem): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  // Reconciliation
  async getReconciliationLogs(period?: string): Promise<ReconciliationLog[]> {
    const logs = Array.from(this.reconciliationLogs.values());
    if (period) {
      return logs.filter(l => l.period === period);
    }
    return logs;
  }

  async createReconciliationLog(data: Omit<ReconciliationLog, "id">): Promise<ReconciliationLog> {
    const id = randomUUID();
    const log: ReconciliationLog = {
      ...data,
      id,
    };
    this.reconciliationLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
