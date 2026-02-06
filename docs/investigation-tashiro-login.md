# 田代さんログイン不可の調査結果

## 調査日

2025-02-06

## 対象者

- **氏名**: 田代 哲也（たしろ てつや）
- **メール**: tetsuya.tashiro@cosmicb.co.jp
- **ユーザーID**: 5dc5f202-324f-4b9a-86b0-6834e8c0c8c7
- **従業員ID**: 8246

## データベース確認結果

### users テーブル

| 項目       | 値          |
| ---------- | ----------- |
| 存在       | ✅ あり     |
| パスワード | ✅ 設定あり |

### employees テーブル

| 項目               | 値             |
| ------------------ | -------------- |
| 存在               | ✅ あり        |
| user_id 紐付け     | ✅ あり        |
| status             | active         |
| job_position_id    | 13（一般社員） |
| job_position level | **0**          |
| job_type_id        | 1（営業）      |
| job_type code      | SALES          |

## 原因

**現在のログイン許可条件**（`server/routes/auth.ts` 96-99行目）:

```typescript
const hasLoginPermission =
  isAdmin ||
  (employee && employee.jobPositionLevel !== null && employee.jobPositionLevel >= 2) ||
  (employee && employee.jobTypeId !== null && employee.jobTypeId === 5);
```

- **役職レベル2以上** または **職種ID=5（役員）** のどちらかを満たす必要がある。
- 田代さんは **役職レベル0（一般社員）**、**職種ID=1（営業）** のため、いずれも満たさず `hasLoginPermission` が false となる。
- その結果、403「ログイン権限がありません」が返却されている。

## 補足（マスタ値）

### job_positions（役職レベル）

- level 0: 一般社員（GENERAL）← 田代さん
- level 2: リーダー（LEADER）以上でログイン可

### job_types（職種）

- id 1: 営業（SALES）← 田代さん
- id 5: 役員（OFFICER）の場合もログイン可

## 対応案

1. **仕様どおりとする**: 役職レベル2以上／役員のみログイン可のまま、田代さんには役職・職種の変更を依頼する。
2. **条件を緩和する**: 例）役職レベル0以上も許可、または職種に「営業」を追加するなど、要件に合わせて `auth.ts` の条件を変更する。
