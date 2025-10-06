# 受発注見込み入力／月次突合 Webシステム

## プロジェクト概要

Excel相当以上の入力体験とGL（総勘定元帳）との月次突合を半自動化するWebシステムのモックアップ実装。

### 主要機能

#### 1. Excel風データグリッド入力
- **キーボードナビゲーション**: Tab/Shift+Tab（セル移動）、Enter（編集/確定）、矢印キー
- **高速編集操作**: ダブルクリックまたはEnterで編集開始
- **リアルタイムバリデーション**: 入力値の即時チェック
- **オートコンプリート**: 取引先・品目マスタからのインクリメンタルサーチ

#### 2. キーボードショートカット
- `Ctrl + Enter`: 一括保存
- `Ctrl + Shift + ↓`: 行追加
- `Ctrl + Shift + Del`: 選択行削除
- `Ctrl + Shift + D`: 行複製
- `Ctrl + F`: 検索（モック）
- `Alt + 0`: 列レイアウト初期化（予定）

#### 3. GL突合機能
- **厳格突合**: 伝票No + 日付 + 金額での完全一致
- **ファジー突合**: 日付±3日 + 金額での柔軟な突合
- **ステータス表示**: 
  - 🟢 突合済（matched）
  - 🟡 曖昧一致（fuzzy）
  - 🔴 未突合（unmatched）
- **突合パネル**: リアルタイムの突合状況確認、未突合データの一覧表示

#### 4. その他機能
- **期間管理**: 月次（YYYY-MM形式）での データフィルタリング
- **ダークモード対応**: ライト/ダークテーマ切替
- **レスポンシブデザイン**: 各種画面サイズに対応

## 技術スタック

### フロントエンド
- **React 18** + **TypeScript**: UI構築
- **Vite**: ビルドツール
- **Wouter**: 軽量ルーティング
- **TanStack Query**: データフェッチング・キャッシュ管理
- **Shadcn/ui**: UIコンポーネント
- **Tailwind CSS**: スタイリング
- **react-hotkeys-hook**: キーボードショートカット
- **Zod**: スキーマバリデーション

### バックエンド（モック実装）
- **Node.js + Express**: サーバー
- **In-memory Storage**: メモリ内データ管理（ダミーCRUD）
- **Drizzle ORM**: 型定義・スキーマ管理
- **Zod**: サーバーサイドバリデーション

## アーキテクチャ

### データモデル
```
customers (取引先マスタ)
  ├─ id, code, name
  
items (品目マスタ)
  ├─ id, code, name
  
orderForecasts (受発注データ)
  ├─ id, voucherNo, orderDate
  ├─ customer関連 (customerId, code, name)
  ├─ item関連 (itemId, code, name)
  ├─ quantity, unitPrice, amount
  ├─ reconciliationStatus (matched/fuzzy/unmatched)
  └─ glMatchId (突合先GL ID)
  
glEntries (GLデータ)
  ├─ id, voucherNo, transactionDate
  ├─ accountCode, accountName
  ├─ amount, debitCredit
  ├─ reconciliationStatus
  └─ orderMatchId (突合先受発注ID)
```

### コンポーネント構成
```
App.tsx
└─ OrderForecastPage
    ├─ PeriodSelector (期間選択)
    ├─ ExcelDataGrid (メイングリッド)
    │   ├─ AutocompleteSelect (取引先・品目選択)
    │   └─ キーボードショートカット統合
    ├─ GLReconciliationPanel (突合パネル)
    │   └─ ReconciliationStatusBadge
    ├─ KeyboardShortcutsPanel (ショートカットヘルプ)
    └─ ThemeToggle (テーマ切替)
```

## 開発状況

### ✅ 完了した機能
- [x] Excel風データグリッドコンポーネント
- [x] キーボードナビゲーション（Tab, Enter, 矢印キー）
- [x] キーボードショートカット（Ctrl+Enter, Ctrl+Shift+↓など）
- [x] オートコンプリート選択（取引先・品目）
- [x] GL突合パネル（厳格・ファジーマッチング）
- [x] 期間選択機能
- [x] ステータスバッジ・可視化
- [x] ダークモード対応
- [x] レスポンシブデザイン

### 🚧 今後の実装予定（Next Phase）
- [ ] PWA対応（オフライン編集）
- [ ] IndexedDB統合（ローカル下書き保存）
- [ ] データインポート/エクスポート（Excel/CSV）
- [ ] 監査ログ・操作履歴
- [ ] 高度な突合ロジック（AI支援）
- [ ] ユーザー権限管理・承認ワークフロー

## 使い方

### 起動方法
```bash
npm run dev
```

### 基本操作
1. **期間選択**: ヘッダーの期間セレクターで対象月を選択
2. **データ入力**:
   - セルをダブルクリックまたはEnterで編集開始
   - Tab/Shift+Tabでセル移動
   - 取引先・品目はオートコンプリートから選択
3. **行操作**:
   - `Ctrl+Shift+↓`: 新規行追加
   - `Ctrl+Shift+D`: 現在行を複製
   - チェックボックス選択後、`Ctrl+Shift+Del`: 行削除
4. **保存**: `Ctrl+Enter`で一括保存
5. **GL突合**:
   - 「GL突合」ボタンをクリック
   - 厳格突合またはファジー突合を実行
   - 突合結果を確認

### キーボードショートカット
右上のキーボードアイコンをクリックすると、全ショートカット一覧を表示

## デザインガイドライン

詳細は `design_guidelines.md` を参照

### カラーパレット
- **Primary**: Blue (217 91% 60%) - アクション・フォーカス
- **Success**: Green (142 71% 45%) - 突合済
- **Warning**: Orange (38 92% 50%) - 曖昧一致
- **Destructive**: Red (0 84% 60%) - 未突合・エラー

### タイポグラフィ
- **UI**: Inter
- **数値**: JetBrains Mono（等幅フォント）

## 注意事項

### モック実装について
- 現在の実装はダミーデータを使用
- CRUD操作はメモリ内で完結（リロードでデータ消失）
- GL突合ロジックは簡易版（実際の業務ロジックは要カスタマイズ）

### ブラウザ対応
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ライセンス
MIT
