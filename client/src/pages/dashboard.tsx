export default function DashboardPage() {
  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">システム全体の概要を表示します</p>
      </div>
      <div className="text-muted-foreground" data-testid="text-coming-soon">
        この機能は今後実装予定です
      </div>
    </div>
  );
}
