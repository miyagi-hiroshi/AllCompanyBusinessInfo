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

import { OrderForecastRepository, type OrderForecastFilter } from "./orderForecast";
import { GLEntryRepository, type GLEntryFilter } from "./glEntry";
import { CustomerRepository } from "./customer";
import { ItemRepository } from "./item";
import { ProjectRepository } from "./project";
import { AccountingItemRepository } from "./accountingItem";
import { ReconciliationRepository } from "./reconciliation";

/**
 * ストレージインターフェース
 * 全リポジトリのメソッドを集約
 */
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

/**
 * メモリストレージ実装
 * 全リポジトリを統合
 */
export class MemStorage implements IStorage {
  private orderForecastRepo: OrderForecastRepository;
  private glEntryRepo: GLEntryRepository;
  private customerRepo: CustomerRepository;
  private itemRepo: ItemRepository;
  private projectRepo: ProjectRepository;
  private accountingItemRepo: AccountingItemRepository;
  private reconciliationRepo: ReconciliationRepository;

  constructor() {
    this.orderForecastRepo = new OrderForecastRepository();
    this.glEntryRepo = new GLEntryRepository();
    this.customerRepo = new CustomerRepository();
    this.itemRepo = new ItemRepository();
    this.projectRepo = new ProjectRepository();
    this.accountingItemRepo = new AccountingItemRepository();
    this.reconciliationRepo = new ReconciliationRepository();
  }

  // Order Forecasts
  async getOrderForecasts(filter: OrderForecastFilter): Promise<OrderForecast[]> {
    return this.orderForecastRepo.getOrderForecasts(filter);
  }

  async getOrderForecast(id: string): Promise<OrderForecast | undefined> {
    return this.orderForecastRepo.getOrderForecast(id);
  }

  async createOrderForecast(data: InsertOrderForecast): Promise<OrderForecast> {
    return this.orderForecastRepo.createOrderForecast(data);
  }

  async updateOrderForecast(id: string, data: Partial<OrderForecast>): Promise<OrderForecast | undefined> {
    return this.orderForecastRepo.updateOrderForecast(id, data);
  }

  async deleteOrderForecast(id: string): Promise<boolean> {
    return this.orderForecastRepo.deleteOrderForecast(id);
  }

  // GL Entries
  async getGLEntries(filter: GLEntryFilter): Promise<GLEntry[]> {
    return this.glEntryRepo.getGLEntries(filter);
  }

  async getGLEntry(id: string): Promise<GLEntry | undefined> {
    return this.glEntryRepo.getGLEntry(id);
  }

  async createGLEntry(data: InsertGLEntry): Promise<GLEntry> {
    return this.glEntryRepo.createGLEntry(data);
  }

  async updateGLEntry(id: string, data: Partial<GLEntry>): Promise<GLEntry | undefined> {
    return this.glEntryRepo.updateGLEntry(id, data);
  }

  async deleteGLEntry(id: string): Promise<boolean> {
    return this.glEntryRepo.deleteGLEntry(id);
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return this.customerRepo.getCustomers();
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customerRepo.getCustomer(id);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    return this.customerRepo.createCustomer(data);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    return this.customerRepo.updateCustomer(id, data);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customerRepo.deleteCustomer(id);
  }

  async bulkCreateCustomers(data: InsertCustomer[]): Promise<Customer[]> {
    return this.customerRepo.bulkCreateCustomers(data);
  }

  // Items
  async getItems(): Promise<Item[]> {
    return this.itemRepo.getItems();
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.itemRepo.getItem(id);
  }

  async createItem(data: InsertItem): Promise<Item> {
    return this.itemRepo.createItem(data);
  }

  // Projects
  async getProjects(fiscalYear?: number): Promise<Project[]> {
    return this.projectRepo.getProjects(fiscalYear);
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projectRepo.getProject(id);
  }

  async createProject(data: InsertProject): Promise<Project> {
    return this.projectRepo.createProject(data);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    return this.projectRepo.updateProject(id, data);
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projectRepo.deleteProject(id);
  }

  async copyProjectsFromPreviousYear(targetYear: number): Promise<Project[]> {
    return this.projectRepo.copyProjectsFromPreviousYear(targetYear);
  }

  // Accounting Items
  async getAccountingItems(): Promise<AccountingItem[]> {
    return this.accountingItemRepo.getAccountingItems();
  }

  async getAccountingItem(id: string): Promise<AccountingItem | undefined> {
    return this.accountingItemRepo.getAccountingItem(id);
  }

  async createAccountingItem(data: InsertAccountingItem): Promise<AccountingItem> {
    return this.accountingItemRepo.createAccountingItem(data);
  }

  // Reconciliation
  async getReconciliationLogs(period?: string): Promise<ReconciliationLog[]> {
    return this.reconciliationRepo.getReconciliationLogs(period);
  }

  async createReconciliationLog(data: Omit<ReconciliationLog, "id">): Promise<ReconciliationLog> {
    return this.reconciliationRepo.createReconciliationLog(data);
  }
}

export const storage = new MemStorage();

// Export types
export type { OrderForecastFilter, GLEntryFilter };
