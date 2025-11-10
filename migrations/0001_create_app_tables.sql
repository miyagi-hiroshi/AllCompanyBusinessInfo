-- Appスキーマのテーブル作成SQL

CREATE SCHEMA IF NOT EXISTS "app";

CREATE TABLE IF NOT EXISTS "app"."customers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "category" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "fiscal_year" integer NOT NULL,
  "customer_id" varchar NOT NULL,
  "customer_name" text NOT NULL,
  "sales_person" text NOT NULL,
  "service_type" text NOT NULL,
  "analysis_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "budget" text,
  "actual_cost" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."accounting_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."order_forecasts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL,
  "project_code" text NOT NULL,
  "project_name" text NOT NULL,
  "customer_id" varchar,
  "customer_code" text,
  "customer_name" text,
  "accounting_period" text NOT NULL,
  "accounting_item" text NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "remarks" text,
  "period" text NOT NULL,
  "reconciliation_status" text NOT NULL DEFAULT 'unmatched',
  "gl_match_id" varchar,
  "is_excluded" text NOT NULL DEFAULT 'false',
  "exclusion_reason" text,
  "created_by_user_id" varchar,
  "created_by_employee_id" varchar,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."gl_entries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "voucher_no" text NOT NULL,
  "transaction_date" date NOT NULL,
  "account_code" text NOT NULL,
  "account_name" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "debit_credit" text NOT NULL,
  "description" text,
  "period" text NOT NULL,
  "reconciliation_status" text NOT NULL DEFAULT 'unmatched',
  "order_match_id" varchar,
  "is_excluded" text NOT NULL DEFAULT 'false',
  "exclusion_reason" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."reconciliation_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "period" text NOT NULL,
  "executed_at" timestamp NOT NULL DEFAULT now(),
  "matched_count" integer NOT NULL DEFAULT 0,
  "fuzzy_matched_count" integer NOT NULL DEFAULT 0,
  "unmatched_order_count" integer NOT NULL DEFAULT 0,
  "unmatched_gl_count" integer NOT NULL DEFAULT 0,
  "total_order_count" integer NOT NULL DEFAULT 0,
  "total_gl_count" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "app"."angle_b_forecasts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL,
  "project_code" text NOT NULL,
  "project_name" text NOT NULL,
  "customer_id" varchar,
  "customer_code" text,
  "customer_name" text,
  "accounting_period" text NOT NULL,
  "accounting_item" text NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "probability" integer NOT NULL DEFAULT 50,
  "remarks" text,
  "period" text NOT NULL,
  "created_by_user_id" varchar,
  "created_by_employee_id" varchar,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."budgets_revenue" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiscal_year" integer NOT NULL,
  "service_type" text NOT NULL,
  "budget_amount" numeric(14, 2) NOT NULL,
  "remarks" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."budgets_expense" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiscal_year" integer NOT NULL,
  "accounting_item" text NOT NULL,
  "budget_amount" numeric(14, 2) NOT NULL,
  "remarks" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."budgets_target" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiscal_year" integer NOT NULL,
  "service_type" text NOT NULL,
  "analysis_type" text NOT NULL,
  "target_value" numeric(14, 2) NOT NULL,
  "remarks" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."staffing" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" varchar NOT NULL,
  "project_code" text NOT NULL,
  "project_name" text NOT NULL,
  "fiscal_year" integer NOT NULL,
  "month" integer NOT NULL,
  "employee_id" varchar,
  "employee_name" text NOT NULL,
  "work_hours" numeric(5, 2) NOT NULL,
  "remarks" text,
  "created_by_user_id" varchar,
  "created_by_employee_id" varchar,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app"."sessions" (
  "id" varchar PRIMARY KEY,
  "user_id" varchar NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
