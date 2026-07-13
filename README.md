# emoji-rogue / modernized rot.js core

[rot.js](https://github.com/ondras/rot.js)(2012年発のJavaScript向けローグライクツールキット)をフォークし、アルゴリズム部分を**クラスなしの関数型スタイル+最新TypeScript**に全面書き換えたもの。

> **このブランチ(`modernization`)について**: 絵文字ローグ本体(`develop`ブランチ)の土台として行った近代化改修の完了地点(タグ `modernization-complete`)を、ゲーム固有のコードを含まない「近代化されただけのrot.js」として独立に保存している系譜です。原本rot.jsのアルゴリズムを現代的なTypeScriptで使いたいだけの場合はこちらを参照してください。

## 含まれるもの

| サブシステム | 内容 |
|---|---|
| `src/map/` | ダンジョン・迷路生成器8種(Arena / Digger / Uniform / Rogue / Cellular / EllerMaze / DividedMaze / IceyMaze) |
| `src/fov/` | 視界計算3アルゴリズム(discrete / precise / recursive shadowcasting) |
| `src/path/` | 経路探索(A* / Dijkstra) |
| `src/scheduler/` | ターン制スケジューラ3種(Simple / Speed / Action) |
| `src/rng.ts` | Alea疑似乱数(シリアライズ可能な`RngState`+`createRng(seed)`) |
| `src/engine.ts` `src/lighting.ts` | ゲームループ骨格 / 複数光源ライティング |
| `src/noise/` `src/text.ts` `src/stringgenerator.ts` `src/color.ts` | simplexノイズ / 書式トークナイザ / マルコフ連鎖名前生成 / 色演算 |
| `src/renderer/` | Ink(React for CLI)ベースの絵文字グリッドレンダラー |

原本の`Display`(Canvas/DOM描画)はCLI専用化に伴い削除。

## 原本rot.jsからの主な変更

- **ESM専業・strict TypeScript** — `noUncheckedIndexedAccess`等の厳格フラグ全部入りでtypecheckエラー0
- **クラス全廃** — 継承階層を「ファクトリ関数+クロージャ」と判別可能union+独立関数に変換
- **グローバル可変RNGシングルトンの撤廃** — 乱数が必要な関数は全て`rng: Rng`を明示引数で受け取る。`RngState`はプレーンobjectなのでセーブ・リプレイ・シード共有が素直に作れる
- **Result型エラーハンドリング** — 「経路なし」「生成タイムアウト」のような正常系の失敗は`Result<T, E>`、到達不能なバグはthrowに分離
- **挙動互換** — 全サブシステムで原本と突き合わせ検証済み(**乱数消費順まで一致**。同じseedなら原本と同じダンジョンが出る)。ただしDijkstraの呼び出し間キャッシュは地形変化時に古い経路を返すため以後のブランチで廃止しており、意図的な非互換として記録している
- **テスト・CI** — Vitestテスト(旧Jasmine specの全移植+シード総当たりの生成器不変条件テスト)、GitHub Actionsでtypecheck・lint(Biome)・knip・test・buildを毎push検証

## 使い方

npmには公開していません。クローンしてビルドしてください。

```
npm ci
npm run build   # tsdown → dist/index.mjs + 型定義
```

```ts
import { createRng, createDiggerMap } from "emoji-rogue";

const rng = createRng(12345);
createDiggerMap(80, 24, rng).create((x, y, value) => {
	// value: 0 = 床, 1 = 壁(列優先 map[x][y])
});
```

コードの読み方の案内は [docs/architecture.md](docs/architecture.md)、変換の全記録は [docs/tasks.md](docs/tasks.md) を参照。

## 動作環境

- Node.js >= 20
- `src/renderer/`(絵文字グリッド描画)を使う場合のみ: カラー絵文字をフォント
  フォールバックで描画できるターミナルが必要(Windows Terminal等)。詳細は
  [docs/design.md](docs/design.md) の絵文字方針を参照

## ライセンス

原本rot.jsと同じ [BSD-3-Clause](license.txt)。rot.jsの作者は [Ondřej Žára](https://github.com/ondras)。
