# 公開チェックリスト

リポジトリを public に切り替えるときの手順。公開前に済ませたものと、公開時に行うものを分けて記録する。

## 公開前に完了（2026-11-08、2026-11-16 更新）

- [x] 実データ（実在の会社名・エージェント名・URL）が全履歴に含まれていないことを確認
  - 手元の DB から作った辞書で全 blob とコミットメッセージを照合。辞書はリポジトリに残していない
- [x] gitleaks による全履歴の秘密情報スキャン（CI で毎回実行）
- [x] 全コミットの作者メールを GitHub の noreply に変更し、SSH 署名（GitHub 上で Verified）
  - 書き換え前のコミットが残らないよう、GitHub のリポジトリは作り直した（2026-11-16）
  - コミットに使う PC ごとに、リポジトリの `user.email` を noreply にし、SSH 署名を設定しておく
- [x] アプリのローカル限定化: `127.0.0.1` での待ち受け、`Host` ヘッダーの検証、URL は http(s) のみ、CSV インジェクション対策、ボディサイズ上限
- [x] Biome（Lint・フォーマット）と CI（GitHub Actions）、Dependabot
- [x] MIT LICENSE、SECURITY.md
- [x] リポジトリ設定
  - Wiki 無効
  - マージ後にブランチを自動削除
  - Actions: GitHub 公式の Action のみ許可、SHA 固定を必須化、ワークフローの既定権限は読み取りのみ
  - Dependabot アラートとセキュリティ更新を有効化

## 公開時に行う（2026-11-16 完了）

公開前は `main` に直接コミットする運用のため、ブランチのルールは公開時に設定した。公開後の変更は PR 経由で行う。

1. [x] 公開直前にもう一度、実データ混入チェックと gitleaks を実行する
2. [x] リポジトリを public に切り替える
3. [x] `main` のルールセットを設定する: `gh api -X POST repos/pnspj/jobdash/rulesets --input .github/rulesets/main.json`
   - PR 必須（直接プッシュ禁止、承認数 0、マージは squash のみ）、ステータスチェック必須（`Lint, typecheck, test, build`・`Secret scan (gitleaks)`・`Dependency review`・`Analyze (javascript-typescript)`）
   - 署名付きコミット必須、強制プッシュ・削除の禁止、線形履歴、バイパスなし
   - GitHub の画面でルールを変えたら `.github/rulesets/main.json` も合わせて更新する
4. [x] Secret scanning と Push protection を有効化する
5. [x] Private vulnerability reporting を有効化する（SECURITY.md の報告先）
6. [x] Actions: 外部からのフォーク PR のワークフローは承認制にする
7. [x] CodeQL と Dependency review が動くことを確認する（ワークフローはプライベートの間はスキップされる設定）
8. [x] README にスクリーンショット（サンプルデータで撮影したもの）を追加するか検討する
   - スクリーンショットは載せず、ランディングページへのリンクにした
9. [x] GitHub Pages を有効化する（Settings → Pages → Source を「GitHub Actions」にする）。`site/` のランディングページを `.github/workflows/pages.yml` が公開する
   - Source を「Deploy from a branch」の `/docs` にしないこと（設計ドキュメントが公開されてしまう）
   - 有効化後、Actions から Pages ワークフローを手動実行（workflow_dispatch）して公開を確認する
