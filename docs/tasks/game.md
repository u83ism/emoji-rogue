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

## マイルストーン2 — マップ生成器との接続(diggerダンジョンを歩く)

アリーナを`createDiggerMap`のダンジョンに差し替える。乱数を初めて使うマイルストーンなので、「生成で消費したRNGの状態を`GameState.rng`に引き継ぐ」パターンをここで確立する。

- [x] `src/game/initialState.ts`: `buildDungeonGameState(width, height, seed)` を追加(既存のアリーナ版は `buildArenaGameState` に改名しテストフィクスチャとして残す)。diggerで地形を生成し、最初の部屋の中心(`getRoomCenter`)にプレイヤーを配置。**生成後の`rng.getState()`を`GameState.rng`に格納する**(シード再現性の要)
- [x] `src/main.tsx`: `buildDungeonGameState`に差し替え、マップを40x20に拡大
- [x] 扉対応 → **封印(2026-07-13)**: 一度は`getDoors`の座標を地形値2として焼き込み🚪描画+通行可にした(diggerは扉をマップ値として出力せず`Room`オブジェクトにのみ記録する原本仕様のため。Stage 5の「🚪描画確認済み」記録は誤りだった)が、実機確認で①🧱と🚪の色味が近く見分けづらい②`addDoors`が部屋外周に接する床マスを全て扉扱いするため2マス幅の通路が両方🚪になる、と判明。不思議のダンジョン系に扉概念がないことも踏まえ、扉はゲーム層から除去し地形を床/壁の2値に戻した。再導入時はコミット9cf29be(焼き込み実装)を参照
- [x] 実機スモークテスト: ダンジョン内を歩き、壁判定・部屋・通路に問題ないことを確認(2026-07-13。この確認で上記の扉の問題が発覚)

**マイルストーン2完了(2026-07-13)。**

## マイルストーン3 — FOV接続(視界と地形記憶)

precise shadowcasting(半径8)で「今見えている場所」「見たことがある場所の記憶」「未踏の闇」の3層を描き分ける。**可視マスは状態に保存せず毎回導出**(導出できるものはGameStateに持たない)、**既踏破グリッドだけが真の状態**として`GameState.explored`に加わる。

- [x] `GameState`に既踏破グリッド`explored`(boolean、列優先)を追加
- [x] `src/game/vision.ts`: `computeVisiblePoints(terrain, origin)`(壁は光を通さない)+ `deriveExploredState(state)` + テスト(遮蔽の検証含む)
- [x] `advanceTurn`: 移動成功時に新視界でexploredを拡張 + テスト
- [x] 初期状態(arena/dungeon)は開始地点の視界でexploredを初期化
- [x] `frame.ts`: 3層描画 — 可視=絵文字 / 記憶=シルエット(全角スペースU+3000+背景色: 壁#666666・床#262626。絵文字はANSI減光が効かないため背景色で輪郭を表現) / 未踏=無地 + テスト
- [ ] 実機スモークテスト: 視界が壁で遮られること、通った場所がシルエットで残ること、全角スペースでグリッドが崩れないこと(East Asian Width Wideなので理論上は安全)を確認

## バックログ(マイルストーン未整理)
- 敵の追加 + スケジューラ接続 + Dijkstra/A*での追跡AI
- ステータスバー等の周辺UI(絵文字を含まないのでInkのBox/Border使用可)
- 扉ギミック(封印中): 鍵つき扉など「特殊な出入口」として意味を持たせられるようになったら再導入。ただの通過タイルなら不要(不思議のダンジョン系準拠)。焼き込み実装はコミット9cf29be、見分けづらさ・2マス通路問題は上記マイルストーン2の記録を参照
- セーブ/ロード(GameStateのシリアライズ)
- リプレイ(初期状態+アクションログの再生)
- 絵文字セット(100種程度)の選定(`docs/design.md` の未解決項目)
