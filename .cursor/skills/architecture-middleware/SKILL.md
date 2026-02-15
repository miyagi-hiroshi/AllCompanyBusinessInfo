---
name: architecture-middleware
description: Express.jsミドルウェアの責務分離と実装済みミドルウェア一覧。ミドルウェア追加・修正、認証/CSRF/レート制限/監査ログの設計時に使用
---

## 🏗️ ミドルウェア責務分離

### ディレクトリ構造

- **server/middleware/**: グローバルミドルウェア（全ルートに適用）
- **server/routes/middleware/**: ルート固有ミドルウェア（特定ルートのみ適用）

### 実装済みミドルウェア

#### グローバルミドルウェア（server/middleware/）

- **auth.ts**: 認証・認可ミドルウェア
  - `isAuthenticated`: 基本的な認証チェック
  - `requireAuth`: グローバル認証（ユーザーID設定含む）
  - `requireOperationPermission`: 操作権限チェック
  - `requireResourcePermission`: リソース別参照権限チェック

- **security.ts**: セキュリティミドルウェア
  - `setupSecurityMiddleware`: Helmet、レート制限、CSRF保護の統合設定
  - `sanitizeInput`: 入力値サニタイゼーション
  - `sanitizeHTML`: HTMLサニタイゼーション
  - `sanitizeFileName`: ファイル名サニタイゼーション
  - `sanitizeLogData`: ログデータサニタイゼーション

- **csrf.ts**: CSRF保護ミドルウェア
  - `CSRFProtection`: CSRFトークン生成・検証
  - `middleware()`: CSRF検証ミドルウェア
  - `tokenEndpoint()`: CSRFトークン取得エンドポイント

- **fileUploadSecurity.ts**: ファイルアップロードセキュリティ
  - `createSecureUpload`: セキュアなファイルアップロード設定
  - `validateFileContent`: ファイル内容検証
  - `validateFileName`: ファイル名検証
  - 用途別アップロード設定（文書管理、画像アップロード、CSVインポート、証明書アップロード）

- **logMiddleware.ts**: ログ記録ミドルウェア
  - `logMiddleware`: 操作ログ・ログインログ記録
  - セキュリティ監視（ログイン失敗検知、異常IP検知、大量エクスポート検知）
  - WebSocketリアルタイム通知

- **auditMiddleware.ts**: 監査ログミドルウェア
  - `auditDataChanges`: データ変更の自動記録
  - データベース永続化（監査証跡用）
  - 操作履歴の追跡（CREATE、UPDATE、DELETE）
  - セキュリティイベントの記録

- **errorHandler.ts**: エラーハンドリングミドルウェア
  - `AppError`: カスタムエラークラス
  - `errorHandler`: 統一エラーハンドリング
  - `notFoundHandler`: 404エラーハンドリング
  - `asyncHandler`: 非同期エラーラッパー
  - Zodバリデーションエラー対応

### 責務分離の原則

#### 認証・認可

- **認証**: ユーザー認証、セッション管理、従業員ID設定
- **認可**: 操作権限チェック、リソースアクセス制御、スコープ別権限管理

#### セキュリティ

- **入力検証**: バリデーション、サニタイゼーション
- **ファイルセキュリティ**: ファイル検証、危険拡張子ブロック
- **CSRF保護**: トークン生成・検証
- **レート制限**: 用途別制限設定

#### ログ・監視

- **操作ログ**: データ変更操作の記録
- **ログインログ**: 認証試行の記録
- **セキュリティ監視**: 異常パターンの検知・通知
- **監査ログ**: データベース永続化による操作履歴の追跡

#### エラーハンドリング

- **統一エラー処理**: 全APIで一貫したエラーレスポンス
- **カスタムエラー**: AppErrorクラスによる詳細なエラー管理
- **バリデーションエラー**: Zodスキーマエラーの統一処理
- **非同期エラー**: asyncHandlerによる非同期エラーのキャッチ

### 実装ガイドライン

#### 新規ミドルウェア作成時

- グローバル適用: `server/middleware/`に配置
- ルート固有: `server/routes/middleware/`に配置
- 責務を明確に分離し、単一責任の原則に従う
- エラーハンドリングを適切に実装
- ログ出力でデバッグ情報を提供

### エラーハンドリング実装例

```typescript
export function customMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // ミドルウェアの処理
    const result = processRequest(req);

    // 成功時のログ
    logger.info("Middleware processing completed", {
      requestId: req.id,
      userId: req.user?.id,
      result: result,
    });

    next();
  } catch (error) {
    // エラー時のログ
    logger.error("Middleware processing failed", {
      requestId: req.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });

    // エラーレスポンス
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
```

### ログ出力具体例

```typescript
// 認証ミドルウェアのログ例
logger.info("Authentication check started", {
  requestId: req.id,
  path: req.path,
  method: req.method,
  ip: req.ip,
});

// セキュリティミドルウェアのログ例
logger.warn("Suspicious activity detected", {
  requestId: req.id,
  userId: req.user?.id,
  activity: "Multiple failed login attempts",
  ip: req.ip,
  userAgent: req.get("User-Agent"),
});
```

#### 既存ミドルウェア使用時

- **認証**: `requireAuth`を使用
- **権限チェック**: `requireOperationPermission`を使用
- **ファイルアップロード**: 用途別の`createSecureUpload`を使用
- **ログ記録**: `logMiddleware`が自動適用
- **監査ログ**: `auditDataChanges`が自動適用
- **エラーハンドリング**: `AppError`をthrowして統一処理
- **非同期エラー**: `asyncHandler`でラップして安全に処理
