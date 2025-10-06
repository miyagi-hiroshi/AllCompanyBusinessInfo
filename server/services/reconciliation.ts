import type { IStorage } from "../storage";

export type ReconciliationType = "exact" | "fuzzy" | "both";

export interface ReconciliationResult {
  success: boolean;
  matchedCount: number;
  fuzzyMatchedCount: number;
  totalMatched: number;
  totalFuzzy: number;
  totalUnmatched: number;
  unmatchedGL: number;
}

export class ReconciliationService {
  constructor(private storage: IStorage) {}

  async performReconciliation(
    period: string,
    type: ReconciliationType
  ): Promise<ReconciliationResult> {
    // Parse period (format: YYYY-MM) to fiscalYear and month
    const [fiscalYear, month] = period.split('-').map(Number);
    
    const orderForecasts = await this.storage.getOrderForecasts({ fiscalYear, month });
    const glEntries = await this.storage.getGLEntries({ fiscalYear, month });

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
          await this.storage.updateOrderForecast(order.id, {
            reconciliationStatus: "matched",
            glMatchId: matchedGL.id,
          });
          await this.storage.updateGLEntry(matchedGL.id, {
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
          await this.storage.updateOrderForecast(order.id, {
            reconciliationStatus: "fuzzy",
            glMatchId: fuzzyGL.id,
          });
          await this.storage.updateGLEntry(fuzzyGL.id, {
            reconciliationStatus: "fuzzy",
            orderMatchId: order.id,
          });
          fuzzyMatchedCount++;
        }
      }
    }

    // Get updated data
    const updatedOrders = await this.storage.getOrderForecasts({ fiscalYear, month });
    const updatedGL = await this.storage.getGLEntries({ fiscalYear, month });

    const totalMatched = updatedOrders.filter(
      (o) => o.reconciliationStatus === "matched"
    ).length;
    const totalFuzzy = updatedOrders.filter(
      (o) => o.reconciliationStatus === "fuzzy"
    ).length;
    const totalUnmatched = updatedOrders.filter(
      (o) => o.reconciliationStatus === "unmatched"
    ).length;
    const unmatchedGL = updatedGL.filter(
      (g) => g.reconciliationStatus === "unmatched"
    ).length;

    // Create reconciliation log
    await this.storage.createReconciliationLog({
      period,
      executedAt: new Date(),
      matchedCount: totalMatched,
      fuzzyMatchedCount: totalFuzzy,
      unmatchedOrderCount: totalUnmatched,
      unmatchedGlCount: unmatchedGL,
      totalOrderCount: updatedOrders.length,
      totalGlCount: updatedGL.length,
    });

    return {
      success: true,
      matchedCount,
      fuzzyMatchedCount,
      totalMatched,
      totalFuzzy,
      totalUnmatched,
      unmatchedGL,
    };
  }
}
