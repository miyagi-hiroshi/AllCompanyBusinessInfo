# MCP PostgreSQL Server Setup Guide

このガイドでは、Cursor IDEからPostgreSQLデータベースにMCP（Model Context Protocol）経由でアクセスする方法を説明します。

## 概要

カスタムMCPサーバーを実装し、以下の機能を提供します：

- **スキーマ情報取得**: テーブル一覧、カラム情報、インデックス、制約情報の取得
- **クエリ実行**: SELECT、INSERT、UPDATE、DELETE等のSQL実行
- **スキーマ分離**: publicスキーマ（既存システム）とappスキーマ（本アプリ）の個別アクセス
- **セキュアな接続**: 環境変数によるデータベース接続情報の管理

## 前提条件

- Node.js 20以降がインストールされていること
- DATABASE_URL環境変数が設定されていること
- Cursor IDEがインストールされていること

## セットアップ手順

### 1. 環境変数の設定

DATABASE_URL環境変数が設定されていることを確認してください。設定されていない場合、以下のいずれかの方法で設定します：

#### 方法1: .envファイル（推奨）

プロジェクトルートに`.env`ファイルを作成：

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

#### 方法2: システム環境変数

Windows PowerShellで設定：

```powershell
[System.Environment]::SetEnvironmentVariable('DATABASE_URL', 'postgresql://username:password@host:port/database', 'User')
```

### 2. MCPサーバーのビルド

プロジェクトディレクトリで以下のコマンドを実行：

```bash
npm run build:mcp
```

これにより、`dist/mcp-postgres-server.js`が生成されます。

### 3. Cursor MCP設定の確認

`~/.cursor/mcp.json`（Windows: `C:\Users\{ユーザー名}\.cursor\mcp.json`）に以下の設定が追加されていることを確認：

```json
{
  "mcpServers": {
    "postgres-public": {
      "command": "node",
      "args": ["c:/cursol/AllCompanyBusinessInfo/dist/mcp-postgres-server.js"],
      "env": {
        "POSTGRES_SCHEMA": "public"
      }
    },
    "postgres-app": {
      "command": "node",
      "args": ["c:/cursol/AllCompanyBusinessInfo/dist/mcp-postgres-server.js"],
      "env": {
        "POSTGRES_SCHEMA": "app"
      }
    }
  }
}
```

**注意**: `args`のパスは、実際のプロジェクトディレクトリのパスに合わせて調整してください。

### 4. Cursorの再起動

設定を反映させるため、Cursor IDEを完全に終了して再起動してください。

## 使用方法

### 利用可能なツール

MCPサーバーは以下のツールを提供します：

#### 1. `list_tables`

スキーマ内のテーブル一覧を取得します。

**例**:

```
テーブル一覧を表示してください
```

#### 2. `describe_table`

指定したテーブルの詳細情報（カラム、型、制約）を取得します。

**例**:

```
customersテーブルの構造を教えてください
```

#### 3. `get_table_schema`

テーブルの完全なスキーマ情報（カラム、インデックス、外部キー）を取得します。

**例**:

```
projectsテーブルの完全なスキーマ情報を表示してください
```

#### 4. `execute_query`

SQLクエリを実行します。

**例**:

```
SELECT * FROM customers LIMIT 10
```

```
INSERT INTO customers (code, name) VALUES ('C001', 'Test Company')
```

### スキーマの切り替え

- **postgres-public**: 既存システムのテーブル（publicスキーマ）にアクセス
- **postgres-app**: 本アプリケーションのテーブル（appスキーマ）にアクセス

Cursorのチャットで、使用するスキーマを明示的に指定することができます：

```
@postgres-public customersテーブルの一覧を表示
@postgres-app budgetsテーブルの構造を教えて
```

## トラブルシューティング

### MCPサーバーが起動しない

1. DATABASE_URL環境変数が設定されていることを確認
2. `npm run build:mcp`でビルドが成功していることを確認
3. `dist/mcp-postgres-server.js`ファイルが存在することを確認
4. Cursorを完全に再起動

### 接続エラーが発生する

1. データベースが起動していることを確認
2. DATABASE_URLの接続文字列が正しいことを確認
3. ネットワーク接続を確認

### パーミッションエラー

1. データベースユーザーに適切な権限があることを確認
2. スキーマへのアクセス権限を確認

## セキュリティに関する注意事項

- DATABASE_URL環境変数には機密情報（パスワード）が含まれるため、.gitignoreに追加して共有しないこと
- 本番環境では、SSL接続を有効にすることを推奨
- 必要最小限の権限を持つデータベースユーザーを使用すること

## 更新・再ビルド

MCPサーバーのコードを変更した場合、以下のコマンドで再ビルドしてください：

```bash
npm run build:mcp
```

再ビルド後、Cursorを再起動する必要があります。

## 参考情報

- MCPサーバーのソースコード: `server/mcp-postgres-server.ts`
- ビルドスクリプト: `package.json`の`build:mcp`
- 設定ファイル: `~/.cursor/mcp.json`
