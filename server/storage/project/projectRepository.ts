import { 
  type Project, 
  type InsertProject,
} from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * プロジェクトマスタリポジトリ
 * 
 * 操作対象テーブル: projects
 * 責務: プロジェクトマスタのCRUD操作、年度コピー機能
 */
export class ProjectRepository {
  private projects: Map<string, Project>;

  constructor() {
    this.projects = new Map();
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData() {
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
  }

  /**
   * プロジェクトを取得（年度フィルタ可能）
   */
  async getProjects(fiscalYear?: number): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    if (fiscalYear !== undefined) {
      return allProjects.filter(p => p.fiscalYear === fiscalYear);
    }
    return allProjects;
  }

  /**
   * IDでプロジェクトを取得
   */
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  /**
   * プロジェクトを作成
   */
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

  /**
   * プロジェクトを更新
   */
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

  /**
   * プロジェクトを削除
   */
  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  /**
   * 前年度のプロジェクトをコピーして新年度用プロジェクトを作成
   */
  async copyProjectsFromPreviousYear(targetYear: number): Promise<Project[]> {
    const sourceYear = targetYear - 1;
    const sourceProjects = await this.getProjects(sourceYear);
    
    const copiedProjects: Project[] = [];
    for (const sourceProject of sourceProjects) {
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
}
