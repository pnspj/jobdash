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
