# emoji-rogue アーキテクチャガイド

コードベースを初めて読む人(未来の自分を含む)向けの案内。**製品として何を作るか**は `docs/design.md`、**進行中のゲーム実装タスク**は `docs/tasks/game.md`、**近代化改修の完了済み履歴**は `docs/tasks/modernization.md` を参照。このファイルは「今のコードがどういう構造で、どこから読めばいいか」だけを扱う。

## 一言でいうと

rot.js(2012年発のローグライクツールキット)をフォークし、アルゴリズム部分(マップ生成・FOV・経路探索・ターン制スケジューリング)を**クラスなしの関数型スタイル + 最新TypeScript**に全面書き換えたもの。その上に、絵文字タイルをInk(React for CLI)で描画するレンダラーを載せてある。**ゲーム本体(GameState・プレイヤー・入力ループ)はまだ存在しない**。今あるのは「道具箱」と「描画装置」まで。

原本rot.jsとの挙動互換は全サブシステムで検証済み(乱数消費順まで一致。同じseedなら原本と同じダンジョンが出る)。

## 最初に読む3ファイル

1. **`src/rng.ts`** — 全ての土台。このコードベースの設計思想が最も凝縮されている。
   - 純粋な状態遷移 `stepUniform(state) => {value, state}` が核
   - `createRng(seed)` はそれをクロージャで包んだ利便レイヤー
   - **グローバルシングルトンは存在しない**。乱数が必要な関数は全て `rng: Rng` を明示引数で受け取る(原本は `import RNG` で全員が共有シングルトンをmutateしていた。その撤廃がこのフォークの最大の構造変更)
2. **`src/result.ts`** — 10行のResult型。チェーンAPI(`.andThen()`等)は意図的に持たない。使い方は「早期return」一択(`.claude/rules/error-handling.md`)
3. **`src/map/digger.ts`** — 「クラス→ファクトリ関数+クロージャ」変換の代表例。旧 `class Digger extends Dungeon` がどう関数になったかが分かれば、他の全ファイルが同じパターンで読める

## 全体データフロー(現状動くもの)

```
seed
 └→ createRng(seed)                            src/rng.ts
     └→ createDiggerMap(w, h, rng).create(cb)  src/map/
         └→ cb(x, y, value) で map[x][y] を埋める   ※列優先! 0=床, 1=壁, 2=扉
             └→ gridFrom(map, glyphs, fallback)    src/renderer/grid.ts
                 └→ Cell[][](行優先の論理セル)
                     └→ groupIntoRuns(row)          src/renderer/runs.ts
                         └→ <GameScreen>/<MapRow>   src/renderer/*.tsx
                             └→ Ink が端末に描画
```

これを最小構成で通しているのが `scripts/demo-renderer.mjs`(実機スモークテスト用、`npm run build && node scripts/demo-renderer.mjs`)。

## ディレクトリマップ

| 場所 | 中身 | 補足 |
|---|---|---|
| `src/rng.ts` | Alea乱数。`RngState`(プレーンobject)+`createRng` | `RngState`はシリアライズ可能 = 将来のセーブ/リプレイの鍵 |
| `src/result.ts` | `Result<T,E>` / `ok` / `err` | 期待される失敗のみ。バグはthrow |
| `src/map/` | ダンジョン・迷路生成器 8種 | 最重要サブシステム。下記詳細 |
| `src/fov/` | 視界計算 3アルゴリズム | `Fov`は関数型 `(x,y,radius,cb)=>void` |
| `src/path/` | A* / Dijkstra | `Path`は `Result<void, NoPathFound>` を返す |
| `src/scheduler/` | ターン制スケジューラ 3種 | 継承ではなく`SchedulerState`+共有関数の合成 |
| `src/eventqueue.ts` `src/MinHeap.ts` | スケジューラの下回り | 時刻順イベントキュー |
| `src/engine.ts` | ゲームループ骨格 | `createEngine(scheduler)`。lock/unlockで非同期アクター対応 |
| `src/lighting.ts` | 複数光源+簡易ラジオシティ | FOVを注入して使う |
| `src/renderer/` | Inkベース絵文字グリッド描画 | 下記「レンダラーの設計判断」 |
| `src/color.ts` `src/text.ts` `src/stringgenerator.ts` `src/noise/` | 色演算 / `%c{}`書式トークナイザ / マルコフ連鎖名前生成 / simplexノイズ | 独立した小物 |
| `src/indexing.ts` `src/pointkey.ts` `src/util.ts` `src/constants.ts` | 共有ヘルパー | `at`/`toXy` / 座標キー / `DIRS`方向テーブル |
| `src/index.ts` | 公開APIバレル | エクスポート一覧 = 公開API全景 |

## map/ の読み方

全生成器は `CreateCallback = (x, y, contents) => void` にセルを流し込む方式(原本のAPI形状を維持)。**列優先 `map[x][y]`** である点に注意 — レンダラー側(`gridFrom`)で行優先に変換している。

- 入門: `arena.ts`(19行) → `ellermaze.ts` → `dividedmaze.ts` / `iceymaze.ts`
- 中級: `cellular.ts`(セルオートマトン+`connect()`で全空間接続保証)
- 本丸: `digger.ts` + `features.ts`(Room/Corridorは判別可能union `{kind: "room"|"corridor"}`。`corridorIsValid`が検証中にcorridorを短縮するin-place副作用を持つのは原本由来の仕様)
- `uniform.ts` はタイムアウトを `Result<_, GenerationTimedOut>` で返す唯一の生成器
- `rogue.ts` は原本アルゴリズム自体が全部屋の接続を保証しない(接続失敗を静かにスキップ)

生成結果の構造保証は `src/map/invariants.test.ts`(25シード×全生成器で連結性・外周壁・決定性を検証)が担っている。生成器をいじったらまずこれを走らせる。

## レンダラーの設計判断(重要)

`docs/design.md` の核心制約「**絵文字の実行時幅計測を信用しない**」をInk採用と両立させるためのハイブリッド:

- セル単位の `<Box>` は使わない(Inkの過去の絵文字幅バグ ink#733 の震源地。修正済みだが防御的に避ける)
- 代わりに `groupIntoRuns()` で同色連続セルを文字列に事前結合し、1行 = `<Box flexDirection="row">` 内の少数の `<Text>` として描画
- `TILE_W = 2`(1論理セル=1絵文字=2カラム)は設計判断の明文化であって、実測はしない
- 絵文字を含まない周辺UI(ステータスバー等)は普通にInkのBox/Borderを使ってよい
- 差分描画はInkのreconcilerに全部任せる(自前ANSIバッファは書かない)

バリエーションセレクタ付き絵文字(⚠️等)での幅崩れ回帰テストは `GameScreen.test.tsx`。**タイル用絵文字を選ぶときは East Asian Width が Ambiguous な文字(半角中黒「・」等)を避ける** — 実機で1-2pxズレた実績あり(`docs/tasks/modernization.md` Stage 5参照)。

## コーディング規約の要点(詳細は `.claude/rules/`)

- **クラス禁止**。内部状態が必要なら「ファクトリ関数+クロージャ」(`createXxx(...)` がメソッド持ちオブジェクトを返す)
- **Result vs throw**: 経路なし・生成タイムアウトのような「正常系の失敗」はResult。型システムが正しければ到達不能な箇所(不正topology等)はthrow。ソース中の `throw new Error("unreachable: ...")` は全て後者
- **`noUncheckedIndexedAccess` 対応**: 「インデックスが範囲内なのは証明済みだが型システムには見えない」場所は `src/indexing.ts` の `at()` を使う(素の `!` や `as` は使わない)
- **座標キー**: Recordのキーに座標を使うときは `src/pointkey.ts` の `encodePointKey/decodePointKey`(`"x,y"`形式)。直書きテンプレートリテラル禁止
- テストはソースと同居(`foo.ts` → `foo.test.ts`)。横断テストは `map/generators.test.ts`・`map/invariants.test.ts` の2つだけ

## 検証コマンド

```
npm run typecheck   # tsc --noEmit(エラー0が正常)
npm run lint        # Biome
npm run knip        # 未使用ファイル・export検出
npm test            # Vitest(367件)
npm run build       # tsdown → dist/
```

CI(`.github/workflows/ci.yml`)がpush/PR毎に全部走らせる。

## 次に作るもの(ゲーム層)

`docs/tasks/game.md` 参照(設計方針とマイルストーン)。要点:

- **ゲーム層**: `advanceTurn(state, action): GameState` の純粋リデューサ方式を採用(2026-07-13決定)。`RngState` がプレーンobjectなのでGameStateに含めれば、セーブ・リプレイ・シード共有(デイリーチャレンジ)が構造的にほぼ無料になる。マイルストーン1は「何もないマップでプレイヤー移動」のWalking Skeleton
- **Dijkstraのキャッシュ**: 廃止済み(2026-07-13)。原本rot.js由来の呼び出し間キャッシュは地形変化時に古い経路を黙って返すため除去し、`createDijkstraPath` は呼び出しごとに探索し直す。性能が問題になったら距離場(Dijkstraマップ)のターンごと純粋導出で対応する方針
