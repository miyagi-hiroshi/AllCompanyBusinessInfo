export default function BudgetPage() {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">予算登録</h1>
        <p className="text-muted-foreground mt-1">プロジェクトごとの予算を登録します</p>
      </div>
      <div className="text-muted-foreground" data-testid="text-coming-soon">
        この機能は今後実装予定です
      </div>
    </div>
  );
}
