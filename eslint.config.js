import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import a11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import promise from "eslint-plugin-promise";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import compat from "eslint-plugin-compat";

export default tseslint.config(
  // 無視するファイル・ディレクトリ
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      "**/*.d.ts",
      "AttendanceTracker/**", // サブプロジェクトを除外
    ],
  },

  // 基本設定
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // ファイル指定
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // ブラウザ実行環境
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        // Node.js実行環境
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": a11y,
      import: importPlugin,
      "simple-import-sort": simpleImportSort,
      promise,
      sonarjs,
      unicorn,
      compat,
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": { 
        typescript: { 
          project: "./tsconfig.eslint.json" 
        }, 
        node: true 
      },
      // browserslist を参照（package.json または .browserslistrc に定義）
      targets: "> 0.5%, not dead", // compat 用のフェイルセーフ
    },
    rules: {
      /** ---------- 最小限の重要ルール ---------- */
      // デバッガー残存は絶対にエラー
      "no-debugger": "error",
      
      // console.logは警告（開発時は許可）
      "no-console": ["warn", { allow: ["warn", "error"] }],
      
      // 未使用変数は警告（_で始まるものは除外）
      "@typescript-eslint/no-unused-vars": [
        "warn", 
        { 
          argsIgnorePattern: "^_", 
          varsIgnorePattern: "^_", 
          caughtErrorsIgnorePattern: "^_" 
        }
      ],
      
      // any型の使用は警告
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Reactの基本的なルール
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      
      // 構文エラーは絶対にエラー
      "no-unreachable": "error",
      "no-fallthrough": "error",
      
      /** ---------- 型安全性関連は警告レベル（段階的改善） ---------- */
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      
      /** ---------- Promise関連は警告レベル ---------- */
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/await-thenable": "warn",
      "@typescript-eslint/unbound-method": "warn",
    }
  },

  // サーバー側（適度な緩和）
  {
    files: ["server/**/*.ts", "server/**/*.tsx", "scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      // サーバー側ではany型使用を許可（段階的改善のため）
      "@typescript-eslint/no-explicit-any": "off",
      // 未使用変数は警告レベル
      "@typescript-eslint/no-unused-vars": [
        "warn", 
        { 
          argsIgnorePattern: "^_", 
          varsIgnorePattern: "^_", 
          caughtErrorsIgnorePattern: "^_" 
        }
      ],
    }
  },

  // クライアント側（より厳格）
  {
    files: ["client/**/*.ts", "client/**/*.tsx"],
    rules: {
      // クライアント側ではany型使用を警告
      "@typescript-eslint/no-explicit-any": "warn",
      // 未使用変数はエラー
      "@typescript-eslint/no-unused-vars": [
        "error", 
        { 
          argsIgnorePattern: "^_", 
          varsIgnorePattern: "^_", 
          caughtErrorsIgnorePattern: "^_" 
        }
      ],
      // React固有ルール
      "react-refresh/only-export-components": "warn",
    }
  }
);