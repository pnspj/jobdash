# JobDash - 転職活動 選考状況管理

| 構成 | 技術 | ポート |
|---|---|---|
| DB | DynamoDB Local (Docker) | 8000 |
| API | Hono + @hono/node-server (`backend/`) | 8787 |
| Web | Next.js (App Router) + Tailwind CSS + TanStack Query (`frontend/`) | 3000 |
| 共通 | zod スキーマ・型・選択肢定義 (`packages/shared/`) | - |

設計方針・データモデル・合意事項は [docs/design.md](docs/design.md) を参照。

## セットアップと起動

npm workspaces によるモノレポです。依存関係のインストールはリポジトリのルートで行います。

```bash
npm install                 # ルートで実行（全 workspace）
docker compose up -d        # DynamoDB Local

npm run dev:backend         # API（起動時に JobHuntingTable が無ければ自動作成）
npm run dev:frontend        # 別ターミナル → http://localhost:3000
```

テーブルだけを作成したい場合: `npm run init-table -w backend`

## テスト

```bash
npm test                    # 全 workspace
npm run typecheck           # 全 workspace の型チェック
```

- `packages/shared`: スキーマ・並び順の単体テスト
- `backend`: API の結合テスト。DynamoDB Local 上のテスト用テーブル `JobHuntingTable_test` を使う（本番データには触れない）
- `frontend`: CSV 変換ロジックの単体テスト

## データ管理

- **バックアップ / 復元**: 画面上部の「データ管理」から、全データを JSON でダウンロード・復元できます。復元すると現在のデータはすべて置き換えられます。
- **データ移行**: スキーマを変えたときは `backend/scripts/` の移行スクリプトを使います。既定は変更内容の表示（dry run）のみで、`--apply` を付けると `backups/` に JSON を書き出してから適用します。
  ```bash
  npm run migrate:v2 -w backend               # dry run
  npm run migrate:v2 -w backend -- --apply    # 適用
  ```

## CSV インポート / エクスポート

- **エクスポート**: 一覧画面の「CSVエクスポート」。UTF-8 (BOM 付き) で全項目を出力します。
- **インポート**: 一覧画面の「CSVインポート」(`/import`)。
  1. CSV を選択（UTF-8 / Shift_JIS）
  2. 列の対応付け（ヘッダー名から自動推定。Notion / JobDash エクスポートの列名を認識）
  3. 値の対応付け（選考フェーズ・アクションの選択肢、エージェントの表示名）
  4. プレビューで行ごとのエラー・既存と同名の企業を確認して取り込み
- 日付は `November 9, 2026 15:00 (GMT+9)`（Notion）、`2026-11-09 15:00`、`2026/11/9`、`2026年11月9日` などに対応。

## 環境変数（任意）

- backend: `DYNAMODB_ENDPOINT` (default `http://localhost:8000`), `TABLE_NAME` (default `JobHuntingTable`), `PORT` (default `8787`), `FRONTEND_ORIGIN` (default `http://localhost:3000`)
- frontend: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8787`。変更する場合は `.env.example` を `.env.local` にコピーして編集)

## WSL で Docker Desktop を使う場合

WSL 内の `docker` コマンドが Docker に接続できないときは、Docker Desktop の **Settings → Resources → WSL Integration** で使用中のディストリビューションを有効にしてください。
