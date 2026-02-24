# AGENTS.md

> AIエージェント向けルール要約。詳細は `.cursor/rules/` 参照。

## Tech Stack

3層: クライアント(React, Wouter, TanStack Query, Shadcn/ui, Tailwind) / API(Express, Zod) / DB(PostgreSQL, Drizzle ORM)

## Prohibitions

- セキュリティ: 秘密鍵ハードコード、未検証入力、機密ログ、SQLインジェクション、CSRF無効化
- API: `fetch`直接使用 → `apiRequest`必須、エラーハンドリング必須
- 認証: 全エンドポイントで`requireOperationPermission`必須、`req.user.employeeId`使用（`req.user.employee.id`禁止）
- DB: 生SQL禁止→Drizzle必須、CASCADE DELETE禁止、トランザクション必須
- コーディング: `any`型禁止（サーバー例外除く）、型未定義の関数、lint/型チェック/prettierなしコミット

## Conventions

- レスポンス: 成功`{ success: true, data }` / エラー`{ success: false, message }`
- 命名: コンポーネント=kebab-case.tsx、フック=use[機能名].ts、コミット=英語Conventional Commits
- インポート: 共通型は`@shared/types/`、その他は相対パス
- DBスキーマ: `app`と`public`の混在禁止

## Codex Operation Rules

- 作業開始時に `.cursor/rules/*.mdc` と `.cursor/skills/**/SKILL.md` を確認し、該当ルール/スキルを優先適用する。
- ユーザーが skill 名を指定した場合、その `SKILL.md` を開いて手順に従う。

## References

`.cursor/rules/` に9種の必須ルール、`.cursor/skills/` にタスク別スキルあり。
