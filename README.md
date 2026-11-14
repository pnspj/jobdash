# JobDash - 転職活動 選考状況管理

転職活動の選考状況を管理する、個人用のローカル Web アプリです。認証はなく、自分の PC の中だけで動きます。

## 主な機能

- **ダッシュボード**: 次回アクションのある企業と ToDo を、日時の近い順に 1 つの一覧で表示
- **企業一覧・企業詳細**: 選考フェーズ・アクション・次回アクション日時の管理、企業研究（志望理由・逆質問・魅力/不安・タグ・総合評価など）
- **カレンダー**: 面接日時と面接希望日時の登録（週表示でドラッグ）と表示
- **エージェント**: エージェントの情報と ToDo
- **連絡用テキスト**: エージェントに送る面接予定・選考状況・志望度のテキストを生成
- **職務経歴書**: 編集と、テキスト・Markdown・Word・PDF への出力（面接対策メモは出力しない）
- **集計**: 選考フェーズ別のグラフ（全体・エージェント別）
- **データ管理**: JSON バックアップ・復元、CSV インポート・エクスポート、サンプルデータ

## 構成

| 構成 | 技術                                                               | ポート |
| ---- | ------------------------------------------------------------------ | ------ |
| DB   | DynamoDB Local (Docker)                                            | 8000   |
| API  | Hono + @hono/node-server (`backend/`)                              | 8787   |
| Web  | Next.js (App Router) + Tailwind CSS + TanStack Query (`frontend/`) | 3000   |
| 共通 | zod スキーマ・型・選択肢定義・サンプルデータ (`packages/shared/`)  | -      |

## ドキュメント

| ファイル                                               | 内容                                       |
| ------------------------------------------------------ | ------------------------------------------ |
| [docs/design.md](docs/design.md)                       | 設計方針・データモデル・機能仕様・合意事項 |
| [docs/sample-persona.md](docs/sample-persona.md)       | サンプルデータの利用者像（架空の人物）     |
| [docs/release-checklist.md](docs/release-checklist.md) | リポジトリ公開時の手順                     |
| [SECURITY.md](SECURITY.md)                             | セキュリティポリシーと脆弱性の報告先       |
| [AGENTS.md](AGENTS.md)                                 | コーディングエージェント向けの開発ルール   |

## セットアップと起動

必要なもの: Node.js 24 以上、Docker（Docker Desktop など。Windows は WSL 上で使う）

npm workspaces によるモノレポです。以下のコマンドは**リポジトリのルートで**実行してください。

```bash
npm install                 # 初回のみ（全 workspace）
npm start                   # → http://localhost:3000
```

`npm start` は DynamoDB Local（Docker）を起動し、フロントエンドをビルドしてから、API とフロントエンドを本番モードで起動します。Ctrl+C で API・フロントエンド・DynamoDB Local をまとめて停止します（データは Docker の volume に残ります）。API は起動時に `JobHuntingTable` が無ければ作成します。

初めて開くと、ダッシュボードにチュートリアルが表示されます。「サンプルを見る」を選ぶと、サンプルデータで操作を試せます。

### 開発モード

`npm run dev` で、同じ構成を開発モード（ファイル変更の自動反映あり）で起動できます。個別に起動する場合は次のとおりです。

```bash
docker compose up -d        # DynamoDB Local
npm run dev:backend         # API
npm run dev:frontend        # 別ターミナルでフロントエンド
```

`dev:backend` / `dev:frontend` はルート用のスクリプトです。`frontend/` などの中では `npm run dev` で起動します。テーブルだけを作成したい場合は `npm run init-table -w backend` を実行します。

### 環境変数（任意）

- backend: `DYNAMODB_ENDPOINT` (default `http://localhost:8000`), `TABLE_NAME` (default `JobHuntingTable`), `PORT` (default `8787`), `FRONTEND_ORIGIN` (default `http://localhost:3000`), `ALLOWED_HOSTS`（許可する `Host` をカンマ区切りで。既定は `localhost,127.0.0.1,[::1]`）
- frontend: `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8787`。変更する場合は `.env.example` を `.env.local` にコピーして編集)

### WSL で Docker Desktop を使う場合

WSL 内の `docker` コマンドが Docker に接続できないときは、Docker Desktop の **Settings → Resources → WSL Integration** で使用中のディストリビューションを有効にしてください。

## データ管理

画面上部の「データ管理」から操作します。

- **バックアップ / 復元**: 全データを JSON でダウンロード・復元できます。復元すると現在のデータはすべて置き換えられます。
- **全データの削除**: 最下部から。確認のため「削除」と入力する必要があります。API は `DELETE /api/data?confirm=DELETE_ALL`。
- **サンプルデータ**: `packages/shared/samples/sample-data.json` に、架空の企業 30 社・エージェント 3 件・ToDo・職務経歴書のデータがあります（実在の企業名・URL は含みません）。「データ管理」またはチュートリアルの「サンプルデータを読み込む」、またはコマンドで読み込めます。面接などの日付は読み込み時に週単位でずらし、今後の予定が必ず未来になるようにします（曜日は変わりません）。**現在のデータはすべて置き換えられます。**

  ```bash
  npm run seed:sample -w backend -- --yes        # サンプルで全データを置き換え
  npm run sample:generate -w @jobdash/shared     # 生成スクリプトから JSON を作り直す
  ```

- **データ移行**: スキーマを変えたときは `backend/scripts/` の移行スクリプトを使います。既定は変更内容の表示（dry run）のみで、`--apply` を付けると `backups/` に JSON を書き出してから適用します。

  ```bash
  npm run migrate:v3 -w backend               # dry run
  npm run migrate:v3 -w backend -- --apply    # 適用
  ```

  - v2: 次回アクション日時の統合、「辞退/不通過」の分割
  - v3: 自由入力のエージェントをエージェント（`agentId`）に移行

### CSV インポート / エクスポート

- **エクスポート**: 企業一覧の「CSVエクスポート」。UTF-8 (BOM 付き) で全項目を出力します。
- **インポート**: 企業一覧の「CSVインポート」(`/import`)。
  1. CSV を選択（UTF-8 / Shift_JIS）
  2. 列の対応付け（ヘッダー名から自動推定。Notion / JobDash エクスポートの列名を認識）
  3. 値の対応付け（選考フェーズ・アクションの選択肢、エージェントの紐づけ先。未登録のエージェントは取り込み時に作成）
  4. プレビューで行ごとのエラー・既存と同名の企業を確認して取り込み
- 日付は `November 9, 2026 15:00 (GMT+9)`（Notion）、`2026-11-09 15:00`、`2026/11/9`、`2026年11月9日` などに対応しています。

## テスト・開発

```bash
npm test                    # 全 workspace（backend は DynamoDB Local が必要）
npm run typecheck           # 全 workspace の型チェック
npm run lint                # Biome（Lint とフォーマットのチェック）
npm run format              # Biome で自動整形・自動修正
npm run sample:check        # サンプル JSON が生成スクリプトの出力と一致するか
```

- `packages/shared`: スキーマ、並び順、ダッシュボード・連絡用テキスト・集計・職務経歴書出力のロジック、サンプルデータの単体テスト
- `backend`: API の結合テスト。DynamoDB Local 上のテスト用テーブル `JobHuntingTable_test` を使う（本番データには触れない）
- `frontend`: CSV 変換、カレンダーの表示ロジックなどの単体テスト

コミット時には、ステージしたファイルを Biome で自動チェックします（`.githooks/pre-commit`）。`npm install` 時に `prepare` スクリプトが `git config core.hooksPath .githooks` を設定します。チェックで止まったら `npm run format` で整形し、内容を確認してからステージし直してください。

CI（GitHub Actions）では、上記に加えてフロントエンドのビルド、`npm audit`、gitleaks による全履歴の秘密情報スキャンを実行します。公開リポジトリでは CodeQL と Dependency Review も動きます。依存関係の更新は Dependabot が週次で PR を作ります。

## セキュリティ

認証のないローカル専用アプリです。外部から触れないよう、次のようにしています（報告先は [SECURITY.md](SECURITY.md)）。

- API・フロントエンド（dev / start）・DynamoDB Local は `127.0.0.1` だけで待ち受けます。
- API は `Host` が `localhost` / `127.0.0.1` 以外のリクエストを拒否します（DNS リバインディング対策）。許可するホストは `ALLOWED_HOSTS` で変更できます。
- URL 項目は `http(s)://` のみ受け付けます。CSV エクスポートでは数式として解釈される値（`=` `+` `-` `@` で始まる値）を無害化します。
- リクエストボディは 5MB までです。
- Next.js の匿名テレメトリ（`frontend` の npm スクリプトで `NEXT_TELEMETRY_DISABLED=1` を指定）とアップグレード通知（`next.config.ts` の `experimental.agentUpgrade: false`）を無効にしています。ただし開発モード（`next dev`）では、Next.js がエラー表示用のバージョン確認のために npm レジストリにアクセスします（無効にする設定がありません）。データは送信しません。
