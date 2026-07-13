# emoji-rogue ゲーム開発タスクトラッカー

ここから先のゲーム実装(GameState・入力ループ・敵・UI)のトラッカー。`develop`/`develop-loop` スキルはここを読んでタスクを選ぶ。近代化改修(rot.jsフォークの関数型変換)の完了済み履歴は `docs/tasks/modernization.md` を参照(タグ `modernization-complete` が完了地点)。

## ゲーム層の設計方針(2026-07-13決定)

- ゲーム層は純粋リデューサ `advanceTurn(state: GameState, action: Action): GameState`。シェル(入力読み取り・描画)だけが命令的レイヤー
- `RngState` を `GameState` に含める。乱数消費は必ず状態経由 → セーブ(GameStateのシリアライズ)・リプレイ(初期状態+アクションログ)・シード共有(デイリーチャレンジ)が構造的にほぼ無料になる
- 関数値(`passable` コールバック等)は `GameState` に入れない(シリアライズ不能・純粋性を壊す)。地形はデータとして持ち、`isPassable(state.map, x, y)` のような純粋関数で導出する
- `Action` は判別可能union(`{ type: "...", payload: {...} }`)
- 経路計算が将来ボトルネックになったら、キャッシュではなくプレイヤー起点の距離場(Dijkstraマップ)のターンごと純粋導出で対応する(`docs/tasks/modernization.md` 末尾の決定を参照)

## マイルストーン1 — Walking Skeleton(何もないマップでプレイヤー移動)

外周壁だけの空マップでプレイヤー🧑を歩かせる最小構成。目的は (1) 純粋リデューサ方式を最小構成のまま形にする、(2) Stage 5レンダラーに「動くエンティティ」を初めて載せて、実プレイ操作で絵文字グリッドが崩れないことを実機検証する。

- [x] `src/game/state.ts`: `GameState`(マップ寸法、地形データ、プレイヤー座標、`RngState`)と `Action`(`move` / `quit`)の型定義。`RngState` はまだ乱数を使わなくても最初から含める(後から足すとセーブ形式が壊れるため)。初期状態構築は `src/game/initialState.ts`(`buildInitialGameState(width, height, seed)`、`createArenaMap`を再利用)に分離
- [x] `src/game/advanceTurn.ts` + テスト: 外周壁との衝突判定つき移動。壁方向への`move`は位置が変わらない(同一参照が返る)ことを含めて検証
- [x] 描画接続: `src/game/frame.ts` の `buildFrameGrid(state)` 純粋関数(既存の `gridFrom` / `<GameScreen>` を再利用し、地形の上にプレイヤーを重ねる)+ テスト。絵文字は3種のみ: プレイヤー🧑・床(Stage 5実機検証済みの🟫)・外周壁🧱
- [x] `src/main.tsx`(シェル): Inkの`render` + `useInput`で「キー入力→`Action`変換→`advanceTurn`→再描画」のループ。キー→Action変換は `src/game/keymap.ts` の `toAction` 純粋関数(+テスト)。矢印キー+hjkl両対応、`q`/Ctrl+Cで終了。差分描画はInkのreconcilerに任せる(自前ANSIバッファは書かない — `docs/architecture.md`「レンダラーの設計判断」参照)。起動は `npm run build && npm start`
- [x] Windows Terminal実機スモークテスト: `npm run build && npm start` で実際に歩き回ってグリッド崩れ・ちらつきがないことを確認(2026-07-13)

**マイルストーン1完了(2026-07-13)。**

**やらないこと(後続マイルストーン)**: FOV、マップ生成器との接続、敵、ステータスバーUI、セーブ

## バックログ(マイルストーン未整理)

- マップ生成器との接続(`createDiggerMap`等で生成した地形を歩く)
- FOV接続(視界外の暗転・既踏破領域の記憶)
- 敵の追加 + スケジューラ接続 + Dijkstra/A*での追跡AI
- ステータスバー等の周辺UI(絵文字を含まないのでInkのBox/Border使用可)
- セーブ/ロード(GameStateのシリアライズ)
- リプレイ(初期状態+アクションログの再生)
- 絵文字セット(100種程度)の選定(`docs/design.md` の未解決項目)
