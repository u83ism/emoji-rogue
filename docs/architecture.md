# emoji-rogue アーキテクチャガイド

コードベースを初めて読む人(未来の自分を含む)向けの案内。**製品として何を作るか**は `docs/design.md`、**進行中のゲーム実装タスク**は `docs/tasks/game.md`、**近代化改修の完了済み履歴**は `docs/tasks/modernization.md` を参照。このファイルは「今のコードがどういう構造で、どこから読めばいいか」だけを扱う。

## 一言でいうと

rot.js(2012年発のローグライクライブラリ)をフォークし、アルゴリズム部分(マップ生成・FOV・経路探索)を**クラスなしの関数型スタイル + 最新TypeScript**に全面書き換えた「道具箱」(`src/` 直下と `src/map/` 等)の上に、**純粋リデューサ方式のゲーム層**(`src/game/`)と**Ink製絵文字レンダラー**(`src/renderer/`)を載せた、一通り遊べるCLIローグライク。シェル(`src/main.tsx`)がキー入力を `Action` に変換して `advanceTurn` に流し、返ってきた `GameState` を描画する — ゲームロジックはすべて純粋関数の世界に閉じている。

原本rot.jsとの挙動互換はフォーク層の全サブシステムで検証済み(乱数消費順まで一致。同じseedなら原本と同じダンジョンが出る)。

## 3層構造と読み順

| 層 | 場所 | 役割 |
|---|---|---|
| フォーク層(道具箱) | `src/` 直下・`src/map/`・`src/fov/`・`src/path/` 等 | rot.js由来のアルゴリズム。ゲームを知らない |
| ゲーム層(純粋核) | `src/game/` | `advanceTurn(state, action): GameState` のリデューサと、その状態・生成・検証。I/Oなし |
| シェル層(命令的殻) | `src/main.tsx`・`src/statusBar.tsx`・`src/messages.ts`・`src/saveFile.ts` 等 | 入力読み取り・文言化・描画・ファイルI/O。ここだけが効果を持つ |

**フォーク層を読むなら**: ①`src/rng.ts`(純粋な状態遷移 `stepUniform(state) => {value, state}` が全ての土台。グローバルシングルトンは存在しない — 乱数が必要な関数は全て `rng` を明示引数で受け取る) ②`src/result.ts`(10行のResult型。チェーンAPIなし、早期return一択) ③`src/map/digger.ts`(「クラス→ファクトリ関数+クロージャ」変換の代表例)。

**ゲーム層を読むなら**: ①`src/game/state.ts`(`GameState`と`Action`の型定義 = ゲームの全語彙。関数値を含まない完全シリアライズ可能なデータ) ②`src/game/advanceTurn.ts`(リデューサ本体。move/wait/use-item/save/quitの5アクション) ③`src/game/events.ts`(`GameEvent` = ゲーム内の出来事の判別可能union。核は文字列を作らず、文言化はシェルの `src/messages.ts` に集約 — i18n規律)。

## 全体データフロー

```
キー入力 (useInput)                        src/main.tsx
 └→ toAction / toUseItemAction             src/game/keymap.ts, inventoryKeymap.ts
     └→ advanceTurn(state, action)         src/game/advanceTurn.ts
         ├→ applyMove → 攻撃/階段/拾得/わな    combat.ts, floor.ts, pickups.ts, trapTrigger.ts
         ├→ applyUseItem(網羅switch)          useItem/index.ts → 各カテゴリモジュール
         ├→ advanceEnemies(敵の1ターン)       enemies.ts, enemyMovement.ts
         └→ applyTurnEndTicks(状態異常等)     hunger.ts, confusion.ts, ...
             └→ buildFrameGrid(state)      src/game/frame.ts + glyphs.ts
                 └→ <GameScreen>           src/renderer/ (Inkが端末に描画)
```

新しいフロアは `floorLayout.ts`(digger地形 + `floorEnemies.ts`/`floorItems.ts` のスポーンテーブル)が生成し、`floor.ts` の `descendStairs`/`ascendStairs` が遷移させる。**rngは常に `GameState.rng` 経由で消費される**ので、セーブ・リプレイ・シード共有が構造的に成立する。

## ディレクトリマップ(ゲーム層)

| 場所 | 中身 |
|---|---|
| `state.ts` / `events.ts` / `balance.ts` | 型定義(GameState/Action) / イベントunion+kindカタログ / 全調整ノブ |
| `advanceTurn.ts` | リデューサ本体。`pickups.ts`(拾得)・`trapTrigger.ts`(わな)・`teleport.ts`(ランダム転移)が脇を固める |
| `useItem/` | アイテム使用。`index.ts`のdefaultなし網羅switchが`equipment/potions/scrolls/wands/rings/food`へ分配。**kind追加時のハンドラ書き忘れはコンパイルエラー** |
| `combat.ts` / `enemies.ts` / `enemyMovement.ts` | 攻撃解決(共通コア`applyEnemyHit`) / 敵の1ターン / A*追跡・徘徊 |
| `floor.ts` / `floorLayout.ts` / `floorEnemies.ts` / `floorItems.ts` / `spawnPool.ts` | フロア遷移 / フロア組み立て / 敵・アイテムのスポーンテーブル(**配列順=rng消費順**。並び替えは全シードを変える) / 抽選プール |
| `hunger.ts` `confusion.ts` `levitation.ts` `blindness.ts` `paralysis.ts` `detectMonsters.ts` `regeneration.ts` `windsOfKron.ts` `experience.ts` | ターン終了時tick群。1状態異常=1ファイル |
| `vision.ts` / `frame.ts` / `glyphs.ts` | FOV導出(可視集合は保存せず毎回導出、既踏破のみ状態) / フレーム構築 / 絵文字辞書 |
| `save.ts` / `replayFile.ts` / `validateGameState.ts` / `validateReplay.ts` | セーブ・リプレイの**純粋な**形式化とパース(`SAVE_FORMAT_VERSION`/`REPLAY_FORMAT_VERSION`)。ファイルI/Oはシェル側の `src/saveFile.ts`/`src/replayFile.ts` |
| `inventory.ts` / `keymap.ts` / `inventoryKeymap.ts` / `score.ts` / `initialState.ts` / `columns.ts` | 持ち物操作 / キー変換 / スコア / 初期状態(`INITIAL_RUN_STATE`に集約) / グリッド生成ヘルパー |
| `index.ts` | ゲーム層の公開APIバレル(`demo/`のブラウザ埋め込み向け) |

シェル層: `main.tsx`(入力ループ+セッション) / `statusBar.tsx`・`inventoryOverlay.tsx`(chrome部品) / `messages.ts`+`gameNames.ts`(イベント→日本語。ロケール差し替え点) / `systemMessages.ts`(ですます調のシステム通知 — ログとは別物) / `saveFile.ts`・`replayFile.ts`(ファイルI/O) / `cliArgs.ts`。

フォーク層は従来どおり: `src/map/`(生成器8種) `src/fov/`(3アルゴリズム) `src/path/`(A*/Dijkstra) `src/scheduler/`+`src/engine.ts`(未接続のまま温存) `src/lighting.ts` `src/color.ts` `src/text.ts` `src/noise/` `src/stringgenerator.ts`、共有ヘルパー `src/indexing.ts` `src/pointkey.ts` `src/util.ts` `src/constants.ts`、公開バレル `src/index.ts`。

## map/ の読み方

全生成器は `CreateCallback = (x, y, contents) => void` にセルを流し込む方式(原本のAPI形状を維持)。**列優先 `map[x][y]`** である点に注意 — レンダラー側(`gridFrom`)で行優先に変換している。

- 入門: `arena.ts`(19行) → `ellermaze.ts` → `dividedmaze.ts` / `iceymaze.ts`
- 中級: `cellular.ts`(セルオートマトン+`connect()`で全空間接続保証)
- 本丸: `digger.ts` + `features.ts`(Room/Corridorは判別可能union。`corridorIsValid`が検証中にcorridorを短縮するin-place副作用を持つのは原本由来の仕様)
- `uniform.ts` はタイムアウトを `Result<_, GenerationTimedOut>` で返す唯一の生成器
- `rogue.ts` は原本アルゴリズム自体が全部屋の接続を保証しない(接続失敗を静かにスキップ)

生成結果の構造保証は `src/map/invariants.test.ts`(25シード×全生成器で連結性・外周壁・決定性を検証)が担っている。生成器をいじったらまずこれを走らせる。

## レンダラーの設計判断(重要)

`docs/design.md` の核心制約「**絵文字の実行時幅計測を信用しない**」をInk採用と両立させるためのハイブリッド:

- セル単位の `<Box>` は使わない(Inkの過去の絵文字幅バグ ink#733 の震源地。修正済みだが防御的に避ける)
- 代わりに `groupIntoRuns()` で同色連続セルを文字列に事前結合し、1行 = `<Box flexDirection="row">` 内の少数の `<Text>` として描画
- `TILE_W = 2`(1論理セル=1絵文字=2カラム)は設計判断の明文化であって、実測はしない
- 絵文字を含まない周辺UI(ステータスバー等)は普通にInkのBox/Borderを使ってよい(💰は実機検証済みの意図的な例外)
- 差分描画はInkのreconcilerに全部任せる(自前ANSIバッファは書かない)

バリエーションセレクタ付き絵文字(⚠️等)での幅崩れ回帰テストは `GameScreen.test.tsx`。**タイル用絵文字を選ぶときは単一コードポイント・Unicode 6.0以前を基本とし、East Asian Width が Ambiguous な文字を避ける**(`src/game/glyphs.ts` の各コメントと `docs/tasks/modernization.md` Stage 5参照)。

## コーディング規約の要点(詳細は `.claude/rules/`)

- **クラス禁止**。内部状態が必要なら「ファクトリ関数+クロージャ」
- **Result vs throw**: 「正常系の失敗」はResult、型が正しければ到達不能な箇所はthrow(`throw new Error("unreachable: ...")`)
- **unionの分岐はlookupテーブルか網羅switch**(`balance.ts`の`ENEMY_MAX_HP`イディオム / `useItem/index.ts`のdefaultなしswitch)。3分岐超のif連鎖は禁止
- **union要素名は文脈なしで自己記述的に**(`"teleport-scroll"`。カテゴリ1号が汎用名を占拠しない)
- **`noUncheckedIndexedAccess` 対応**: 範囲内が証明済みの添字アクセスは `src/indexing.ts` の `at()`(素の `!` や `as` は使わない)
- **座標キー**: `src/pointkey.ts` の `encodePointKey/decodePointKey`(`"x,y"`形式)。直書き禁止
- **ファイルは200行まで**: `scripts/check-file-sizes.mjs` が`npm run lint`で強制(ゲーム層+シェル層対象、フォーク層とテストは対象外。例外は理由付き登録のみ)
- テストはソースと同居(`foo.ts` → `foo.test.ts`)。横断テストは `map/generators.test.ts`・`map/invariants.test.ts` と `advanceTurn.test.ts` のファズテスト

## 検証コマンド

```
npm run typecheck   # tsc --noEmit(エラー0が正常)
npm run lint        # Biome + ファイル行数ゲート
npm run knip        # 未使用ファイル・export検出
npm test            # Vitest(803件・2026-07-16時点)
npm run build       # tsdown → dist/
```

CI(`.github/workflows/ci.yml`)はPR毎に全部走らせる(pushトリガーはmaster指定のため現運用のdevelopブランチでは発火しない — コスト判断で意図的に現状維持、2026-07-16)。

実機確認の手段: `npm run build && npm start`(Windows Terminal必須)、`node scripts/demo-renderer.mjs`(レンダラー単体)、`node scripts/replay-verify.mjs`(リプレイ再構築)、`demo/`(ブラウザ版)。

## 設計上の既知の決定

- **Dijkstraのキャッシュ廃止**(2026-07-13): 原本由来の呼び出し間キャッシュは地形変化時に古い経路を返すため除去。性能が問題になったら距離場のターンごと純粋導出で対応
- **スケジューラ未接続**: クロージャベースの`Scheduler`はシリアライズ可能な`GameState`と相性が悪い。敵の速度差は`ENEMY_ACTIONS_PER_TURN`のプレーンデータで表現(マイルストーン9)
- **イベントログはローリングウィンドウ**(直近20件)。ラン全体の履歴は持たない — ラン通算の事実が必要なら`hasAttacked`のような恒久フィールドを直接持つ(マイルストーン54の教訓)
