# JobDash - 転職活動 選考状況管理

| 構成 | 技術 | ポート |
|---|---|---|
| DB | DynamoDB Local (Docker) | 8000 |
| API | Hono + @hono/node-server | 8787 |
| Web | Next.js (App Router) + Tailwind CSS | 3000 |

## 起動手順

```bash
# 1. DynamoDB Local
docker compose up -d

# 2. API (起動時に JobHuntingTable が無ければ自動作成)
cd backend && npm install && npm run dev

# 3. フロントエンド (別ターミナル)
cd frontend && npm install && npm run dev
```

http://localhost:3000 を開きます。

テーブルだけを作成したい場合は `cd backend && npm run init-table`。

## 環境変数（任意）

- backend: `DYNAMODB_ENDPOINT` (default `http://localhost:8000`), `PORT` (default `8787`), `FRONTEND_ORIGIN` (default `http://localhost:3000`)
- frontend: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8787`。変更する場合は `.env.example` を `.env.local` にコピーして編集)

## API スモークテスト

API 起動中に `cd backend && npm run smoke` で CRUD 全体を検証できます。

## CSV インポート / エクスポート

- **エクスポート**: 一覧画面の「CSVエクスポート」。UTF-8 (BOM 付き) で全項目を出力します。
- **インポート**: 一覧画面の「CSVインポート」(`/import`)。
  1. CSV を選択（UTF-8 / Shift_JIS）
  2. 列の対応付け（ヘッダー名から自動推定。Notion / JobDash エクスポートの列名を認識）
  3. 値の対応付け（選考フェーズ・アクションの選択肢、エージェントの表示名）
  4. プレビューで行ごとのエラー・既存と同名の企業を確認して取り込み
- 日付は `November 9, 2026 15:00 (GMT+9)`（Notion）、`2026-11-09 15:00`、`2026/11/9`、`2026年11月9日` などに対応。時刻は「次回アクション時刻」として保存されます。

フロントエンドの CSV 変換ロジックのテスト: `cd frontend && npm test`
