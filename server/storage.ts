import { 
  type OrderForecast, 
  type InsertOrderForecast,
  type GLEntry,
  type InsertGLEntry,
  type Customer,
  type InsertCustomer,
  type Item,
  type InsertItem,
  type Project,
  type InsertProject,
  type AccountingItem,
  type InsertAccountingItem,
  type ReconciliationLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

// Filter interfaces
export interface OrderForecastFilter {
  fiscalYear: number;
  month?: number;
  projectId?: string;
}

export interface GLEntryFilter {
  fiscalYear: number;
  month?: number;
}

// Storage interface for the application
export interface IStorage {
  // Order Forecasts
  getOrderForecasts(filter: OrderForecastFilter): Promise<OrderForecast[]>;
  getOrderForecast(id: string): Promise<OrderForecast | undefined>;
  createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast>;
  updateOrderForecast(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | undefined>;
  deleteOrderForecast(id: string): Promise<boolean>;

  // GL Entries
  getGLEntries(filter: GLEntryFilter): Promise<GLEntry[]>;
  getGLEntry(id: string): Promise<GLEntry | undefined>;
  createGLEntry(data: InsertGLEntry): Promise<GLEntry>;
  updateGLEntry(id: string, data: Partial<GLEntry>): Promise<GLEntry | undefined>;
  deleteGLEntry(id: string): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  bulkCreateCustomers(data: InsertCustomer[]): Promise<Customer[]>;

  // Items
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(data: InsertItem): Promise<Item>;

  // Projects
  getProjects(fiscalYear?: number): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  copyProjectsFromPreviousYear(targetYear: number): Promise<Project[]>;

  // Accounting Items
  getAccountingItems(): Promise<AccountingItem[]>;
  getAccountingItem(id: string): Promise<AccountingItem | undefined>;
  createAccountingItem(data: InsertAccountingItem): Promise<AccountingItem>;

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
  private projects: Map<string, Project>;
  private accountingItems: Map<string, AccountingItem>;
  private reconciliationLogs: Map<string, ReconciliationLog>;

  constructor() {
    this.orderForecasts = new Map();
    this.glEntries = new Map();
    this.customers = new Map();
    this.items = new Map();
    this.projects = new Map();
    this.accountingItems = new Map();
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

    // Mock projects
    const mockProjects: Project[] = [
      { 
        id: "1", 
        code: "P001", 
        name: "プロジェクトA", 
        fiscalYear: 2024, 
        customerId: "1",
        customerName: "株式会社A商事",
        salesPerson: "山田太郎",
        serviceType: "インテグレーション",
        analysisType: "生産性",
        createdAt: new Date() 
      },
      { 
        id: "2", 
        code: "P002", 
        name: "プロジェクトB", 
        fiscalYear: 2024, 
        customerId: "2",
        customerName: "B物産株式会社",
        salesPerson: "佐藤花子",
        serviceType: "エンジニアリング",
        analysisType: "粗利",
        createdAt: new Date() 
      },
      { 
        id: "3", 
        code: "P003", 
        name: "プロジェクトC", 
        fiscalYear: 2025, 
        customerId: "3",
        customerName: "C工業株式会社",
        salesPerson: "鈴木一郎",
        serviceType: "ソフトウェアマネージド",
        analysisType: "生産性",
        createdAt: new Date() 
      },
      { 
        id: "4", 
        code: "P004", 
        name: "プロジェクトD", 
        fiscalYear: 2025, 
        customerId: "4",
        customerName: "株式会社Dサービス",
        salesPerson: "高橋次郎",
        serviceType: "リセール",
        analysisType: "粗利",
        createdAt: new Date() 
      },
      { 
        id: "5", 
        code: "P005", 
        name: "プロジェクトE", 
        fiscalYear: 2025, 
        customerId: "5",
        customerName: "E商事株式会社",
        salesPerson: "田中三郎",
        serviceType: "インテグレーション",
        analysisType: "生産性",
        createdAt: new Date() 
      },
    ];
    mockProjects.forEach(p => this.projects.set(p.id, p));

    // Mock accounting items
    const mockAccountingItems: AccountingItem[] = [
      { id: "1", code: "AC001", name: "売上高", createdAt: new Date() },
      { id: "2", code: "AC002", name: "売上原価", createdAt: new Date() },
      { id: "3", code: "AC003", name: "販売費及び一般管理費", createdAt: new Date() },
      { id: "4", code: "AC004", name: "営業外収益", createdAt: new Date() },
      { id: "5", code: "AC005", name: "営業外費用", createdAt: new Date() },
    ];
    mockAccountingItems.forEach(ai => this.accountingItems.set(ai.id, ai));
  }

  // Order Forecasts
  async getOrderForecasts(filter: OrderForecastFilter): Promise<OrderForecast[]> {
    return Array.from(this.orderForecasts.values()).filter(o => {
      // Parse period (YYYY-MM) to get year and month
      const [year, month] = o.period.split('-').map(Number);
      
      // Filter by fiscal year
      if (year !== filter.fiscalYear) return false;
      
      // Filter by month if specified
      if (filter.month !== undefined && month !== filter.month) return false;
      
      // Filter by project if specified
      if (filter.projectId !== undefined && o.projectId !== filter.projectId) return false;
      
      return true;
    });
  }

  async getOrderForecast(id: string): Promise<OrderForecast | undefined> {
    return this.orderForecasts.get(id);
  }

  async createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast> {
    const id = randomUUID();
    const orderForecast: OrderForecast = {
      ...data,
      id,
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
  async getGLEntries(filter: GLEntryFilter): Promise<GLEntry[]> {
    return Array.from(this.glEntries.values()).filter(g => {
      // Parse period (YYYY-MM) to get year and month
      const [year, month] = g.period.split('-').map(Number);
      
      // Filter by fiscal year
      if (year !== filter.fiscalYear) return false;
      
      // Filter by month if specified
      if (filter.month !== undefined && month !== filter.month) return false;
      
      return true;
    });
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

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated: Customer = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  async bulkCreateCustomers(data: InsertCustomer[]): Promise<Customer[]> {
    const customers: Customer[] = [];
    for (const item of data) {
      const customer = await this.createCustomer(item);
      customers.push(customer);
    }
    return customers;
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

  // Projects
  async getProjects(fiscalYear?: number): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    if (fiscalYear !== undefined) {
      return allProjects.filter(p => p.fiscalYear === fiscalYear);
    }
    return allProjects;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(data: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;

    const updated: Project = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  async copyProjectsFromPreviousYear(targetYear: number): Promise<Project[]> {
    const sourceYear = targetYear - 1;
    const sourceProjects = await this.getProjects(sourceYear);
    
    const copiedProjects: Project[] = [];
    for (const sourceProject of sourceProjects) {
      // Generate new code with target year
      const newCode = sourceProject.code.replace(String(sourceYear), String(targetYear));
      
      const newProject: Project = {
        ...sourceProject,
        id: randomUUID(),
        code: newCode,
        fiscalYear: targetYear,
        createdAt: new Date(),
      };
      
      this.projects.set(newProject.id, newProject);
      copiedProjects.push(newProject);
    }
    
    return copiedProjects;
  }

  // Accounting Items
  async getAccountingItems(): Promise<AccountingItem[]> {
    return Array.from(this.accountingItems.values());
  }

  async getAccountingItem(id: string): Promise<AccountingItem | undefined> {
    return this.accountingItems.get(id);
  }

  async createAccountingItem(data: InsertAccountingItem): Promise<AccountingItem> {
    const id = randomUUID();
    const accountingItem: AccountingItem = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.accountingItems.set(id, accountingItem);
    return accountingItem;
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
