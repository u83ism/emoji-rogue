# emoji-rogue ゲーム開発タスクトラッカー

ここから先のゲーム実装(GameState・入力ループ・敵・UI)のトラッカー。`develop`/`develop-loop` スキルはここを読んでタスクを選ぶ。近代化改修(rot.jsフォークの関数型変換)の完了済み履歴は `docs/tasks/modernization.md` を参照(タグ `modernization-complete` が完了地点)。

## ゲーム層の設計方針(2026-07-13決定)

- ゲーム層は純粋リデューサ `advanceTurn(state: GameState, action: Action): GameState`。シェル(入力読み取り・描画)だけが命令的レイヤー
- `RngState` を `GameState` に含める。乱数消費は必ず状態経由 → セーブ(GameStateのシリアライズ)・リプレイ(初期状態+アクションログ)・シード共有(デイリーチャレンジ)が構造的にほぼ無料になる
- 関数値(`passable` コールバック等)は `GameState` に入れない(シリアライズ不能・純粋性を壊す)。地形はデータとして持ち、`isPassable(state.map, x, y)` のような純粋関数で導出する
- `Action` は判別可能union(`{ type: "...", payload: {...} }`)
- 経路計算が将来ボトルネックになったら、キャッシュではなくプレイヤー起点の距離場(Dijkstraマップ)のターンごと純粋導出で対応する(`docs/tasks/modernization.md` 末尾の決定を参照)
- **ログとシステム通知の区別(2026-07-14決定)**: メッセージログ=**ゲーム世界の中の出来事**(戦闘、将来のアイテム取得・階層移動)だけを流す。`GameEvent`になりセーブ/リプレイに載る。システム通知=**アプリ/セッションの都合**(セーブしました、全角入力警告)はシェルの持ち物で、`GameState`に入れずログと1行空けて表示する。核がシェルの効果(ファイル書き込み等)を先取りしてイベント化しない。文体でも区別: ログは常体(「たおした!」)、通知はですます調(「セーブしました」)
- **i18n規律(2026-07-13決定)**: `GameState`・`Action`・将来のイベント/メッセージログに人間向け文字列を入れない。核は常にデータ(判別可能union、例: `{type:"player-hit", payload:{by:"zombie", damage:3}}`)を出し、文言化はシェル側の1箇所(将来のロケール差し替え点)に集約する。i18nライブラリの導入は実際に多言語化するときまで不要。絵文字は言語中立なので翻訳面積は元々小さい。日本語等のCJK文言はchrome行限定(マップグリッドに文字列を混ぜない既存規律の適用)

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
- [x] 実機スモークテスト: 視界の遮蔽・シルエット記憶・全角スペースのグリッド安定性を確認(2026-07-13)

**マイルストーン3完了(2026-07-13)。** 補足: shadowcasting(放射状の視界)は現代ローグライクの流儀で、オリジナルRogue・不思議のダンジョン系は「部屋単位で全開示+通路は周囲1マス」方式。方式変更の可能性についてはバックログ参照。

## マイルストーン4 — 敵の追加(追跡AI・初のリデューサ内乱数消費)

🧟が数体徘徊するダンジョン。**`advanceTurn`内で`state.rng`を消費して次状態へ引き継ぐパターンの初運用**(これまで乱数は初期生成のみだった)。ターン構造は「プレイヤー1手→全敵1手」の単純交互で、rot.jsスケジューラ(速度差システム)は敵に速度差をつけたくなるまで温存。HP・戦闘もまだ(接触=即ゲームオーバー)。

- [x] `GameState`に`enemies: readonly Position[]`と`status: "dead"`を追加(`Position`型も新設)
- [x] スポーン: 当初「最初の部屋以外の部屋から」だったが、実機で部屋1つ+通路のみのダンジョンが生成され敵ゼロになるケースが発覚。**開始時の視界外にある床マスからrngで3体抽選**(部屋数非依存、初期画面に敵が映らない保証つき)に変更。全面可視の極小マップのみプレイヤー以外の床への配置にフォールバック
- [x] `src/game/enemies.ts`: `advanceEnemies(state)` — プレイヤー視界内の敵はA*(topology 4)で追跡(乱数不使用)、視界外は`stepUniform`でランダム徘徊(rng消費)。敵同士は重なれない。幅1通路で仲間が経路を塞ぐ場合は「仲間無視の経路の第一歩が空いていれば進む」フォールバックで隊列になる。プレイヤーのマスに踏み込んだら`status: "dead"` + テスト
- [x] `advanceTurn`: 移動成功時に敵ターンを実行。敵のいるマスへは移動不可(バンプ、ターン消費なし)。`status`が`playing`以外なら移動を無視 + テスト
- [x] `frame.ts`: 視界内の敵だけ🧟で描画(視界外の敵は見えない) + テスト
- [x] `main.tsx`: `dead`で赤字の終了メッセージを表示して終了
- [x] 追い詰められソフトロックの修正: 実機プレイで「移動先が全部塞がれるとバンプ=ターン消費なしの仕様により敵の手番が永遠に来ない」スタックが発覚。待機アクション(`.`/スペース)を追加して解決。待機は戦術コマンド(引き寄せ・待ち伏せ)としても機能する
- [x] 実機スモークテスト: 追跡・視界外での消失・接触ゲームオーバー・待機を確認(2026-07-13)

**マイルストーン4完了(2026-07-13)。** 実機プレイで発覚し修正したレアケース3件: 追い詰められソフトロック(待機コマンドで解決)、部屋1つダンジョンで敵ゼロ(視界外床マス抽選で解決)。

## マイルストーン5 — HP・戦闘 + ステータスバー + メッセージログ

「接触=即ゲームオーバー」をバンプ戦闘(移動先に相手がいたら攻撃)に置き換える。**i18n規律(上記2026-07-13決定)の初運用**: リデューサはデータのイベント(判別可能union)を出し、日本語文言化はシェル側の1箇所に集約する。絵文字を含まない周辺UI(ステータスバー・ログ行)もここで初導入 — chrome行なのでInkの`Box`/`Border`が使える(`docs/architecture.md`「レンダラーの設計判断」参照)。

- [x] `src/game/state.ts`: `Enemy`型(`Position & { readonly kind, hp }` — 既存の`enemy.x`/`enemy.y`参照コードを壊さない)、`playerHp`、`GameEvent`判別可能union(`player-hit` / `enemy-hit` / `enemy-defeated` / `player-died`。敵種は`kind: "zombie"`タグ。**人間向け文字列を入れない**)、`events: readonly GameEvent[]`(セーブ/リプレイに載る真の状態。肥大防止に直近20件のみ保持=`src/game/events.ts`の`buildEventLog`)。バランス定数は`src/game/balance.ts`の1箇所に集約(実機で調整する前提の仮値。ダメージは当面固定値=戦闘は決定的。乱数幅はプレイフィールを見てから)
- [x] プレイヤーのバンプ攻撃: `advanceTurn`の`move`で移動先に敵がいる場合、現行「移動不可・ターン消費なし」を「攻撃・ターン消費あり」に変更(壁バンプは引き続きターン消費なし)。敵HPを減らし、0で除去+`enemy-defeated`。攻撃解決は`src/game/combat.ts`(`applyPlayerAttack`/`isAdjacent`)に分離 + テスト
- [x] 敵の攻撃: `advanceEnemies`の「プレイヤーのマスに踏み込んだら`status: "dead"`」を「プレイヤーに隣接(topology 4)する敵は移動せず攻撃」に置き換え。`playerHp`が0以下になったら`player-died`+`status: "dead"`(同ターンの残りの敵は行動しない=多重死亡イベント防止)。待機(`wait`)中も隣接敵は攻撃してくる + テスト。※2タスクは表裏一体(片方だけだと攻撃直後に旧・接触即死が必ず発動する)のため1コミットで実施
- [x] 文言化(シェル1箇所): `src/messages.ts`(`src/game/`の外=シェル層)に`formatEvent(event: GameEvent): string`。日本語文言はこのファイルにのみ存在する(将来のロケール差し替え点) + テスト
- [x] `main.tsx`: マップ下にステータスバー(`HP 8/10`形式のテキスト。**絵文字は使わない** — 絵文字入りchromeはInk幅計測の地雷を踏むため。HP3以下で赤表示)と直近3件のメッセージ行。dead時の旧ハードコード文言(`🧟 につかまった……`)は廃止し、ログ内の`player-died`行を赤太字にする方式に統一。※knip(未使用export検出)の都合で文言化とUIは1コミットで実施
- [x] 死亡時にプレイヤーを💀で描画(2026-07-13、実機フィードバックによる追加。💀は単一コードポイント・Unicode 6.0でタイル用絵文字の安定カテゴリ内。quit終了時は🧑のまま)
- [x] 「待機で敵が動かない」報告の解決(2026-07-13): ロジック層では再現せず(30シード×120ターンの待機で視界内非隣接の敵は毎回接近)、原因は**IMEが全角モードでスペースが全角スペース(U+3000)として届いていた**こと。対処は**全角文字を検知したら黄色の警告行で半角切り替えを促す**(`keymap.ts`の`isFullWidthInput` + `messages.ts`の文言)。全角スペースをwaitに割り当てる案は不採用 — 全角モードではhjkl/qがIMEの変換バッファに吸われて届かないため、スペースだけ効かせると「待機はできるのに移動できない」というより深い混乱を招く。有効キーの入力で警告は消える
- [x] 実機スモークテスト: バンプ攻撃・敵撃破・被弾とHP減少・死亡(💀表示含む)・ログ表示を確認(2026-07-13)。バランス調整は見送り — 要素(敵種・アイテム・階層)が少なすぎて調整する段階に至っていないという判断。`balance.ts`の仮値のまま、要素が揃ってから見直す

**マイルストーン5完了(2026-07-13)。** 実機フィードバック由来の追加対応2件: 死亡時💀描画、全角入力モード検知の警告(スペース無反応の原因はIME全角モードだった)。

## マイルストーン6 — セーブ/ロード(中断セーブ)

「`GameState`のシリアライズ=セーブ」という設計投資の回収。方式は不思議のダンジョン系準拠の**中断セーブ**: 1スロット、ロード時にファイルを即消費(再開は1回きり)、死んだらセーブは残らない。保存先は`~/.emoji-rogue/save.json`(依存追加なし、`node:os`の`homedir`)。`formatVersion`フィールドで将来の形式変更に備える。壊れた/改竄されたセーブは「期待される失敗」なのでResultで検証し、失敗時は黙って新規ゲーム開始(ファイルは消費済みなので再試行ループにならない)。

- [x] `Action`に`{type:"save"}`、`GameStatus`に`"suspended"`を追加。リデューサは`status: "suspended"`への遷移だけを行う(**核にファイルI/Oを入れない** — シェルが`suspended`を観測して書き出す)。キーは`s` + テスト
- [x] `src/game/validateGameState.ts`: `validateGameState(value: unknown): Result<GameState, string>`(エラーは不正フィールド名)。寸法整合・地形値・座標の範囲と床上・HP範囲・敵/イベント/RNGの形を検証し、既知フィールドだけで再構築して返す + テスト
- [x] `src/game/save.ts`: `buildSaveFileContent(state)` / `parseSaveFileContent(content): Result<GameState, SaveFileError>`(`malformed-json` / `unsupported-version` / `invalid-state`の判別可能union)。`formatVersion: 1` + ラウンドトリップ含むテスト
- [x] `src/saveFile.ts`(シェル層、fs効果): `saveGameState(state)` / `loadSavedGameState(): GameState | undefined`(読んだ瞬間に削除=消費。検証失敗でも消費する)
- [x] `main.tsx`: 起動時`loadSavedGameState() ?? buildDungeonGameState(...)`。`suspended`観測で`status: "playing"`に戻した状態を書き出して終了、「セーブしました」行を表示(文言は`messages.ts`)
- [x] 実機スモークテスト: セーブ→再起動で同一状態から再開(敵配置・HP・探索済み領域・ログ)、再開後のセーブファイル消滅、死亡後に再起動しても新規ゲームになることを確認(2026-07-14)。指摘1件: 「セーブしました」行がHP直下(=ログの上)に出て時系列が混乱する → chrome行の表示順を「HP→イベントログ→最新のシステム通知(全角警告・セーブ完了)」に統一して修正

- [x] ログ設計の見直し(2026-07-14、実機フィードバック2往復): 一度「セーブしました」をログイベント(`game-saved`)化して時系列統一を試したが、①核がシェルの効果(ファイル書き込み)を先取りして記録する筋の悪さ②再開直後に「セーブした」が最新ログとして残る座りの悪さ③将来のリプレイへのノイズ、から**撤回**。最終形は設計方針の「ログとシステム通知の区別」のとおり: セーブ通知はシェルの持ち物とし、全角警告と同じ通知チャンネル(ログの下に1行空け)に表示。※`game-saved`入りの中間版セーブファイルは検証で弾かれ新規ゲーム開始になる(formatVersionは据え置き — 開発中の1ファイルにしか影響しないため)

- [x] 形式バンプ忘れ防止ガード(2026-07-14追加): セーブファイルの構造(キー構成と型)をピン留めするshape guardテストを`save.test.ts`に追加。GameStateの形を変えるとテストが落ち、「`SAVE_FORMAT_VERSION`のバンプ+期待形の更新」を同時にやるよう促す。イベントpayloadの形は`validateGameState`のテストが担当

**マイルストーン6完了(2026-07-14)。**

## マイルストーン7 — 階段と階数(フロア遷移)

ダンジョンに下り階段を置き、踏むと次のフロアへ降りる。**「run全体が(寸法, seed)だけから再現できる」性質をフロアをまたいで維持する**のが設計の要: 次フロアの生成は`state.rng`から`setState`でRNGを復元して行い、生成後の状態をまた`GameState.rng`に戻す。HP・イベントログ・階数は引き継ぎ、地形・敵・explored・階段は新規。勝利条件はまだない(無限降下)。敵の強さのフロアスケーリングもまだ(毎フロア🧟3体)。

- [x] `GameState`に`floor: number`(1始まり)と`stairs: Position`を追加(地形は床/壁の2値のまま — 階段はエンティティ扱いで描画も敵と同じ重ね描き。地形値を増やすと通行・視界・描画の全`=== 0`判定に波及するため)。`GameEvent`に`floor-descended`(payload: 降りた先の階数)。`validateGameState`更新(floor正整数・stairsが床上)+ **`SAVE_FORMAT_VERSION`を2に**(必須フィールド追加=旧形式は読めないため。旧セーブは`unsupported-version`で消費→新規開始) + テスト
- [x] `src/game/floor.ts`: フロア生成の共通化。`buildDungeonGameState`の中身(digger生成・最初の部屋中心にプレイヤー・視界外床マスから敵3体抽選)を抽出し、階段配置(敵と同じ「開始視界外の床マス」プールから1マス。プレイヤーのマスは除外)を追加。初期化(floor 1)と次フロア生成`descendStairs(state)`(rng継続・HP/ログ/階数+1引き継ぎ・explored新規)の両方で共用 + テスト(同一seedからの2フロア目が決定的であることを含む)
- [x] `advanceTurn`: 階段マスへの移動=自動降下(移動でもバンプでもなくフロア遷移。降下ターンに敵は行動しない — 旧フロアの敵ごと消えるため)。階段マスに敵が乗っている場合は通常のバンプ攻撃が優先 + テスト
- [x] `frame.ts`: 視界内の階段を🔽で描画(単一コードポイント・Unicode 6。プレイヤーが優先されるのは従来どおりだが自動降下なので実際は重ならない。敵が乗った場合は敵が優先)。**既見の階段はシルエット層でも専用色**(#26454aのような床と違う青緑系 — 一度見た階段の位置は覚えていられるべき) + テスト
- [x] `main.tsx`+`messages.ts`: ステータスバー先頭に階数表示(`1F` — 降りるごとに増える)。`floor-descended`の文言「◯階に降りた」(常体=ログ側) + テスト
- [x] 実機スモークテスト: 階段の視認・降下・階数表示・ログ・フロアまたぎのセーブ/ロード・🔽と記憶色の見え方を確認(2026-07-14、問題なし)

**マイルストーン7完了(2026-07-14)。**

## マイルストーン8 — 回復アイテム(アイテム第1号・踏んだら即回復)

階段実装でHPがフロア持ち越しになり、回復手段がないと全runが消耗戦の確定死になるため、その穴を埋める最小のアイテムシステム。**インベントリはまだ作らない**: 踏んだマスの回復薬をその場で飲む(overheal分は無駄になる — 上限で切る)。持ち物メニュー・複数アイテム種は後続マイルストーン。GameStateの形が変わる初の「shape guard実運用」でもある。

- [x] 型: `Item`(`Position & { kind: ItemKind }`、`ItemKind = "potion"`)と`GameState.items`、`GameEvent`に`player-healed`(payload: `by: ItemKind`と実回復量`amount`)。バランス定数`POTION_COUNT_PER_FLOOR = 2`・`POTION_HEAL_AMOUNT = 5`。`validateGameState`(items床上・kind検証)+ **shape guardに従い`SAVE_FORMAT_VERSION`を3に** + テスト
- [x] `floor.ts`: スポーンプールから回復薬を2個抽選(敵・階段と同じプールの続き=位置は全て重複しない)。初期フロア・降下後の両方に湧く + テスト
- [x] `advanceTurn`: 床マスへの移動時、移動先にアイテムがあれば拾って即使用 — `playerHp`を上限クリップで回復し、**実回復量**を`player-healed`に載せる(満タン時は0回復でもアイテムは消費)。その後の敵ターンは通常どおり + テスト
- [x] `frame.ts`: 視界内の回復薬を💊で描画(単一コードポイント・Unicode 6)。重なり優先度: プレイヤー>敵>階段>アイテム。シルエット記憶はなし(敵と同じ扱い — 階段のような恒久ランドマークではないため) + テスト
- [x] `messages.ts`: 「回復薬を飲んだ。HPが5回復した」(常体、実回復量) + テスト
- [x] 実機スモークテスト: 💊の見え方・回復とログ・満タン時の消費・フロアまたぎ湧き・セーブ/ロード(形式3)を確認(2026-07-15、問題なし)

**マイルストーン8完了(2026-07-15)。** shape guard(形式バンプ忘れ防止)が初の実運用で機能した(items追加でテストが落ち、formatVersion 3へのバンプを強制)。

## マイルストーン9 — 敵のバリエーション追加(コウモリ・行動速度に差をつける)

🧟(ゾンビ)しか出ない現状に2種類目の敵🦇(コウモリ)を追加する。ただの見た目違いではなく「1HPで即死するが、プレイヤーのターン中に2回行動する」ことで初めて敵に速度差をつける。バックログの「スケジューラ接続」を検討したが、`src/scheduler/`の`Scheduler`はクロージャ+`EventQueue`(可変ヒープ)を内包しメソッドを持つオブジェクトのため、シリアライズ可能でなければならない`GameState`には直接格納できない(設計方針の「関数値はGameStateに入れない」に抵触)。よって速度差は**種類ごとの「1ターンあたりの行動回数」というプレーンデータ**(`balance.ts`の`ENEMY_ACTIONS_PER_TURN`)で表現し、`advanceEnemies`内でその回数だけ行動ループを回す方式を採用した。`src/scheduler/`は今回は使わず、将来リデューサ外の用途向けに引き続き温存する。

- [x] `src/game/events.ts`: `EnemyKind`に`"bat"`を追加(`GameEvent`の型は`EnemyKind`を参照するだけなので構造変更なし)
- [x] `src/game/balance.ts`: `BAT_MAX_HP = 1`・`BAT_ATTACK_DAMAGE = 1`・`ZOMBIE_ACTIONS_PER_TURN = 1`・`BAT_ACTIONS_PER_TURN = 2`、および種類→値の参照テーブル`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`(`Readonly<Record<EnemyKind, number>>`)を追加。フロアごとの出現数も`ZOMBIE_COUNT_PER_FLOOR = 3`・`BAT_COUNT_PER_FLOOR = 2`としてここに集約
- [x] `src/game/enemies.ts`: `advanceEnemies`を「敵1体につき`ENEMY_ACTIONS_PER_TURN[kind]`回、隣接なら攻撃・視界内ならA*追跡・視界外ならランダム徘徊、を繰り返す」ループに変更(死亡確定後は残り行動もスキップ)。ダメージは`ENEMY_ATTACK_DAMAGE[enemy.kind]`を参照(ゾンビ固定値だった箇所を種類非依存に一般化) + テスト(コウモリが1ターンで2マス追跡する・隣接し続ければ2回攻撃する)
- [x] `src/game/floor.ts`: スポーンプールからゾンビ`ZOMBIE_COUNT_PER_FLOOR`体に続けてコウモリ`BAT_COUNT_PER_FLOOR`体を抽選(階段・アイテムより先。位置は全て重複しない) + テスト
- [x] `src/game/frame.ts`: コウモリを🦇で描画(単一コードポイント)。視界内判定・重なり優先度は既存の敵と同じ扱い + テスト
- [x] `src/messages.ts`: `ENEMY_NAMES`に`bat: "コウモリ"`を追加 + テスト
- [x] `src/game/validateGameState.ts`: 敵・イベントのkind検証を`"zombie"`固定から`"zombie" | "bat"`に拡張(フィールドの型・キー構成は変わらないため**SAVE_FORMAT_VERSIONは据え置き** — shape guardテストの`kind: "string"`は文字列であることしか見ておらず列挙値の追加を検知しない設計。念のためshape guardテストを実行して構造不変を確認した) + テスト
- [ ] 実機スモークテスト: 🦇の見た目・素早い接近・低HPでの即死・隣接し続けた場合の連続攻撃を確認(このセッションはリモート環境のため未実施。次にWindows Terminalで触れるタイミングで確認する)

自動テスト(型検査・lint・Vitest)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン10 — インベントリ導入(即時使用をやめ、選択使用UIを追加)

回復薬は「踏んだら即飲む」だったが、これを「拾って持ち物に貯め、任意のタイミングで使う」に変更する。UI面の投資として、`i`キーで開閉する持ち物オーバーレイ(Ink `Box`の`borderStyle`、文字a/b/c…で選択)を新設した。アイテム種はまだ`potion`のみだが、`GameState.inventory`は種類ごとのスタック(`{kind, quantity}`)として持たせ、種類が増えても構造を変えずに済む形にしてある。

- [x] `src/game/state.ts`: `InventoryEntry`(`{kind: ItemKind, quantity: number}`)を新設し`GameState.inventory: readonly InventoryEntry[]`を追加(容量上限はまだ設けない — 必要になったらバックログへ)。`Action`に`{type: "use-item", payload: {kind: ItemKind}}`を追加
- [x] `src/game/events.ts`: `GameEvent`に`item-picked-up`(payload: `kind`)を追加。既存の`player-healed`は「使った」時にのみ発火するよう用途を変更(構造は不変)
- [x] `src/game/advanceTurn.ts`: 床のアイテムを踏んだら`inventory`に加算するだけ(即使用しない)+ `item-picked-up`を記録。新規`use-item`アクション: 対象の種類を1個消費してpotionなら上限クリップで回復(在庫が無ければ同一参照を返しターン消費なし、`wait`と同様に敵ターンへ進む) + テスト(拾う・スタック・使用・満タン使用・在庫なし・ターン消費の確認)
- [x] `src/game/inventoryKeymap.ts`(新規): `toInventoryLetter(index)`(a, b, c…の割当)と`toUseItemAction(input, inventory)`(オーバーレイ内でのキー→`use-item`アクション変換、純粋関数)+ テスト。通常プレイ中のキー変換(`keymap.ts`)とは責務を分けた
- [x] `src/messages.ts`: `formatInventoryEntry(entry)`(例:「回復薬 x2」)と`item-picked-up`の文言(「回復薬を拾った」)、オーバーレイの見出し`INVENTORY_TITLE`・空表示`INVENTORY_EMPTY_MESSAGE`を追加 + テスト
- [x] `src/main.tsx`: `i`で持ち物オーバーレイの開閉(オーバーレイが開いている間だけ、キー入力の解釈先をリスト選択に切り替える)。**開閉状態はGameStateに入れない**(表示上の関心事であり世界のシミュレーションに影響しないため、セーブに載せてはいけない — 既存の「システム通知はシェルの持ち物」という区別と同じ理屈)。オーバーレイを開いたままの状態遷移(死亡等)は`useEffect`側の終了処理に任せる
- [x] `src/game/validateGameState.ts`: `inventory`フィールドの検証(`kind`・`quantity`は正整数)を追加。`items`/`GameEvent`のkind検証も個別リテラル比較から共通の`isItemKind`ガードに統一。`GameState`にフィールドが増える構造変更のため**`SAVE_FORMAT_VERSION`を4に** + テスト
- [ ] 実機スモークテスト: 拾う→オーバーレイで確認→使う一連の操作感、空表示、`i`/Escでのキャンセル、フロアまたぎでの持ち越し、セーブ/ロード(形式4)を確認(このセッションはリモート環境のため未実施)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン11 — フロアスケーリング(深さに応じて敵を強く/多くする)

無限降下の骨格(マイルストーン7)はあるのに、これまで毎フロア🧟3体+🦇2体で頭打ちだったため「降りる」ことに意味がなかった。深さに応じて出現数を増やし、コウモリの比率も相対的に上げる。HP・攻撃力自体はまだ据え置き(出現数だけのスケーリング) — 変えるパラメータを一度に増やしすぎない方針。マイルストーン10のインベントリにより「深い階に備えて回復薬を温存するか」という判断が初めて意味を持つので、このタイミングで導入する。

- [x] `src/game/balance.ts`: `ZOMBIE_COUNT_PER_FLOOR`/`BAT_COUNT_PER_FLOOR`を`ZOMBIE_COUNT_BASE`/`BAT_COUNT_BASE`に改称し、各種の成長間隔(`growthInterval`: 何フロアごとに+1体か)と上限(`max`)を種類ごとの参照テーブル`ENEMY_COUNT_SCALING: Readonly<Record<EnemyKind, {base, growthInterval, max}>>`にまとめた。ゾンビは3体始まり・3階ごとに+1・上限8体、コウモリは2体始まり・2階ごとに+1・上限8体(コウモリの方が早く増える=深いほど速い敵の比率が増える)。`calculateEnemyCountForFloor(kind, floor)`という純粋関数をここに追加 + テスト
- [x] `src/game/floor.ts`: `buildFloorLayout`が`floor`引数を受け取るようになり、固定回数ループを`calculateEnemyCountForFloor`の戻り値に置き換え。`descendStairs`は`nextFloor`を渡す + テスト(floor1・floor2は従来どおり3体+2体のまま = 既存テストは無変更で通ることを確認。成長が効き始めるfloor4以降の出現数を新規テストで検証)
- [x] `src/game/initialState.ts`: `buildDungeonGameState`から`buildFloorLayout`を呼ぶ際に`floor: 1`を明示的に渡すよう更新(シグネチャ変更への追従のみ)
- [ ] 実機スモークテスト: 深い階に潜って敵の増加・コウモリ比率の上昇を体感で確認(このセッションはリモート環境のため未実施)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン12 — 勝利条件(目標フロアへの到達)

これまでの全マイルストーンは「死をどう遠ざけるか」の積み上げで、勝つ方法が一つもなかった。不思議のダンジョン系に倣い、`GOAL_FLOOR`階に到達したら生還=勝利とする。目標階そのものを新規に生成する必要はない — 到達の瞬間に即座に勝利確定とし、地形生成やボス配置のような重い仕組みは追加しない(最小実装)。

- [x] `src/game/balance.ts`: `GOAL_FLOOR = 10`を追加
- [x] `src/game/state.ts`: `GameStatus`に`"won"`を追加
- [x] `src/game/events.ts`: `GameEvent`に`game-won`(payload: `floor`)を追加
- [x] `src/game/floor.ts`: `descendStairs`で`nextFloor`が`GOAL_FLOOR`に達したら新フロアを生成せず、`game-won`イベントを記録して`status: "won"`・`floor: GOAL_FLOOR`を返す(既存のフロア生成パスとは別の早期return) + テスト
- [x] `src/game/frame.ts`: `status === "won"`のプレイヤーを🎉で描画(💀と同じ「結末を絵で示す」パターン) + テスト
- [x] `src/messages.ts`: `game-won`の文言(「◯階に到達し、生還に成功した!」) + テスト
- [x] `src/main.tsx`: ログ行の色分けを`player-died`(赤太字)に加えて`game-won`(緑太字)にも対応。終了処理自体は既存の「`status !== "playing"`なら`exit()`」に乗るだけで新規分岐は不要
- [x] `src/game/validateGameState.ts`: `game-won`イベントの検証ケースを追加(他の全イベント種と同じ網羅性を保つため。実際には`status`が`"playing"`のときしかセーブされないので`game-won`入りのセーブファイルは理論上存在しないが、一貫性のため) + テスト
- [ ] 実機スモークテスト: 10階到達での勝利演出(🎉・緑太字ログ)とその後の終了を確認(このセッションはリモート環境のため未実施)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン13 — 2種類目のアイテム(剣・恒久攻撃力強化)

インベントリ(マイルストーン10)導入以来、アイテム種は`potion`一つだけで「拾って即使わず貯める」設計が実質検証されていなかった。剣🔪を追加し、potionとは異なる使用挙動(消費して即回復 vs 消費して恒久強化)を持たせることでインベントリ設計の妥当性を検証する。剣は稀にフロアに出現し(`SWORD_SPAWN_CHANCE_PERCENT`、rng消費)、使うと`playerAttackDamage`が`SWORD_ATTACK_BONUS`だけ恒久的に上がる。複数本使えばそのぶん積み上がる(上限は設けない — HPのような「使いすぎると無駄になる」資源ではなく素直な強化なので)。

- [x] `src/game/state.ts`: `GameState`に`playerAttackDamage: number`を追加(これまで`combat.ts`が直接参照していた定数`PLAYER_ATTACK_DAMAGE`を状態化。武器で変化しうる値は状態でなければならない、という核の設計原則の初適用)
- [x] `src/game/events.ts`: `ItemKind`に`"sword"`を追加。`GameEvent`に`weapon-equipped`(payload: `kind`・`bonus`)を追加
- [x] `src/game/balance.ts`: `SWORD_ATTACK_BONUS = 1`・`SWORD_SPAWN_CHANCE_PERCENT = 30`を追加
- [x] `src/game/combat.ts`: `applyPlayerAttack`が定数`PLAYER_ATTACK_DAMAGE`ではなく`state.playerAttackDamage`を参照するように変更 + テスト
- [x] `src/game/initialState.ts`: 初期状態の`playerAttackDamage`を`PLAYER_ATTACK_DAMAGE`で初期化
- [x] `src/game/floor.ts`: スポーンプールから低確率(rng判定)で剣を1本抽選。フロアごとに独立判定(出るとは限らない) + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`をkindで分岐(`potion`=既存の回復、`sword`=`playerAttackDamage`加算+在庫から1本消費+`weapon-equipped`記録) + テスト
- [x] `src/game/frame.ts`: アイテム描画を`POTION_CELL`固定から`ITEM_GLYPHS: Readonly<Record<ItemKind, Cell>>`参照に一般化(`sword: 🔪`追加)。3種目以降もテーブルに足すだけで済む形 + テスト
- [x] `src/messages.ts`: `ITEM_NAMES`に`sword: "剣"`、`weapon-equipped`の文言(「剣を装備した。攻撃力が1上がった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"sword"`を追加。`GameState`に`playerAttackDamage`フィールドが増える構造変更のため**`SAVE_FORMAT_VERSION`を5に** + テスト
- [ ] 実機スモークテスト: 剣の出現・拾う→インベントリで確認→装備・攻撃力上昇後の戦闘の手応え変化を確認(このセッションはリモート環境のため未実施)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン14 — 3種類目のアイテム(盾・恒久防御力強化)

剣(マイルストーン13)と対称に、被ダメージを軽減する盾🦺を追加する。恒久強化アイテムが2種類になったことで「レリック的な永続強化」という枠組み自体が確立される。素直に「被ダメージ - playerDefense」にすると、現状ゾンビ・コウモリの攻撃力が固定1のため盾を1つ装備した瞬間に両方とも0ダメージ=事実上無敵になってしまう。それを避けるため**被ダメージは`MIN_DAMAGE_TAKEN`(=1)を下限にクリップ**する(どれだけ防御力を積んでも最低1は必ず通る)。

- [x] `src/game/state.ts`: `GameState`に`playerDefense: number`を追加(初期値0。`playerAttackDamage`と対称の状態化)
- [x] `src/game/events.ts`: `ItemKind`に`"shield"`を追加。`GameEvent`に`armor-equipped`(payload: `kind`・`bonus`。`weapon-equipped`と対称)を追加
- [x] `src/game/balance.ts`: `SHIELD_DEFENSE_BONUS = 1`・`SHIELD_SPAWN_CHANCE_PERCENT = 30`・`MIN_DAMAGE_TAKEN = 1`を追加
- [x] `src/game/enemies.ts`: 敵の被ダメージ計算を`ENEMY_ATTACK_DAMAGE[kind]`固定から`Math.max(MIN_DAMAGE_TAKEN, ENEMY_ATTACK_DAMAGE[kind] - state.playerDefense)`に変更 + テスト(下限クリップの検証を含む)
- [x] `src/game/initialState.ts`: 初期状態の`playerDefense`を0で初期化
- [x] `src/game/floor.ts`: スポーンプールから低確率(剣と同じ仕組み・独立判定)で盾を1つ抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`shield`分岐を追加(`playerDefense`加算+在庫から1個消費+`armor-equipped`記録) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`shield: 🦺`を追加(単一コードポイント。🛡️は要バリエーションセレクタのため回避 — 剣で🗡️/⚔️を避けたのと同じ理由) + テスト
- [x] `src/messages.ts`: `ITEM_NAMES`に`shield: "盾"`、`armor-equipped`の文言(「盾を装備した。防御力が1上がった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"shield"`を追加。`playerDefense`フィールドの検証(0以上の整数)を追加。構造変更のため**`SAVE_FORMAT_VERSION`を6に** + テスト
- [ ] 実機スモークテスト: 盾の出現・装備・被ダメージ軽減(下限1を含む)の手応え変化を確認(このセッションはリモート環境のため未実施)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機スモークテストのみ保留のため、完了扱いはそれを確認してから。

## マイルストーン15 — ダメージの正規分布乱数幅を検討 → 撤回(ユーティリティは温存)

戦闘を固定値からダイス制にする(バックログ長期保留項目)。**一様乱数ではなく正規分布**を使う方針(2026-07-15決定): 一様乱数の「最大値も最小値も同じ確率」という性質はゲームの手触りとして極端な当たり外れを生みやすく、平均値付近に集まる正規分布の方が「基本は安定・稀に上振れ下振れ」という納得感のある結果になる。`src/rng.ts`の`Rng.getNormal(mean, stddev)`は元々rot.js由来のBox-Muller実装(本物の正規分布)がそのまま残っていたので、これを**変更せず**そのまま使う。

正規分布のサンプリングは棄却法(do-whileで`r`が範囲に収まるまでuniformを引き直す)のため、消費するuniform乱数の回数が可変で、他の乱数消費箇所で使っている`stepUniform(state) => {value, state}`という純粋ステップ関数の形に馴染まない。そこで`floor.ts`の`descendStairs`が既にやっている「`createRng(1).setState(rng)`で`RngState`を一時的にステートフルな`Rng`に包み、使い終わったら`.getState()`で取り出す」という既存パターンを踏襲した新規モジュール`src/game/damage.ts`の`rollDamage(rng, mean, minimum)`に切り出す。

- [x] `src/game/damage.ts`(新規): `rollDamage(rng: RngState, mean: number, minimum: number): {damage: number, rng: RngState}`。`getNormal(mean, DAMAGE_VARIANCE_STDDEV)`を四捨五入し、`minimum`を下限にクリップ + テスト(決定性・下限クリップ・複数シードでの分布の広がりを確認)
- [x] `src/game/balance.ts`: `DAMAGE_VARIANCE_STDDEV = 0.5`を追加
- [x] `src/game/combat.ts`・`src/game/enemies.ts`: 戦闘のダメージ計算を`rollDamage`経由に変更 → **撤回(2026-07-15)**。詳細は下記
- [ ] 実機スモークテスト: 保留のまま撤回により対象外

**撤回の経緯**: `applyPlayerAttack`・`advanceEnemies`の隣接攻撃を`rollDamage`経由に変更し、`combat.test.ts`・`enemies.test.ts`・`advanceTurn.test.ts`のダメージ固定値前提のアサーションも実際のイベント値から導出する形に改めて一度は導入したが、実機確認前に「既存の(固定値)実装に戻したい」という判断で撤回した。`src/game/damage.ts`の`rollDamage`とそのテストは**将来また使うタイミングのためにそのまま残し**、`combat.ts`・`enemies.ts`・上記3テストファイルは撤回前(マイルストーン14終了時点)の固定値実装に戻した。`balance.ts`の`DAMAGE_VARIANCE_STDDEV`も、今は何からも呼ばれないが定数として残置している。

**`Rng.getNormal`について**: `src/rng.ts`のBox-Muller実装は今回このマイルストーンで新規に足したものではなく、近代化改修の初期(コミットb72f753、Windows Terminal実機確認用デモスクリプト追加のタイミング)から存在していた、rot.js由来の「本物の」正規分布実装。今回もこの関数自体には一切手を入れていない。

自動テスト(型検査・lint・Vitest・knip)は通過済み。

## マイルストーン16 — README整備

「歩く→ダンジョンに潜る→敵と戦う→アイテムを拾って使う→フロアを降りる→勝利/死亡→セーブして再開」という一通りのゲームループが揃ったので、区切りとしてREADMEを現状に合わせて書き直す。旧README(マイルストーン1〜2時点の記述のまま放置)は「敵・アイテム・FOVはこれから」と書かれていて実態と大きく乖離していた。

- [x] 「現在の状態」を現状(FOV・敵2種・階層/勝利条件・アイテム3種+インベントリ・セーブロード)に合わせて書き直す
- [x] 操作方法を全キー(移動hjkl/矢印・待機`.`/スペース・インベントリ開閉`i`・使用は文字キー・セーブ`s`・終了`q`)に更新
- [x] 半角入力モードでプレイすることを明記(全角IME検知の警告は実装済みだが事前告知もあるとよい、というバックログ項目への対応)
- [x] 動作環境の推奨フォントを明記(Windows Terminal既定のCascadia Mono/Codeを基準線として案内。絵文字自体はフォントフォールバックで描画されるため主要フォントは等幅なら何でもよい、という既存の説明はそのまま維持)

## マイルストーン17 — ブラウザデモ(GitHub Pages想定)

コア(`advanceTurn`・`buildFrameGrid`)は無改造で動くので、`Cell[][]`をCSS GridのDOMに描く新規シェルを`demo/`に書く。絵文字幅問題(端末最大の地雷)はブラウザではCSSでセル幅を明示できるため存在しない。Inkコンポーネント(`GameScreen`/`MapRow`)の再利用は狙わない — xterm.jsハックより素のDOMシェル新書きの方が筋がいいため。

- [x] `src/game/index.ts`(新規): 埋め込み先(ブラウザデモ等)向けのゲーム層公開APIバレル。`src/index.ts`(近代化rot.jsツールボックス側のバレル)とは別物として新設 — ツールボックスとゲーム層の境界を保つ。`advanceTurn`・`buildDungeonGameState`・`buildFrameGrid`・関連型に加え、`src/messages.ts`(ゲーム層の外にあるシェル向けi18n集約点)の`formatEvent`/`formatInventoryEntry`/`INVENTORY_TITLE`/`INVENTORY_EMPTY_MESSAGE`も再エクスポートし、デモ側の import 元を1つに保つ
- [x] `tsdown.config.ts`: `src/game/index.ts`をビルドエントリに追加(`dist/game/index.mjs`として出力)
- [x] `docs/architecture.md`: ディレクトリマップに`src/game/index.ts`の行を追加
- [x] `demo/index.html` + `demo/main.js`(新規、素のJS・ビルド不要): `dist/game/index.mjs`を`<script type="module">`から直import。`Cell[][]`をCSS GridのDOMセルとして描画、ステータスバー(階数・HP)・直近ログ・インベントリオーバーレイ(`i`キー開閉+文字キー選択、端末版のキー体系を踏襲)を実装。`?seed=123`のURLパラメータでシード指定に対応。セーブ/ロードは対象外(ブラウザにファイルシステムがないため。将来欲しくなったら`localStorage`が差し込み口)
- [x] 実機確認(このセッション内でPlaywright + ヘッドレスChromiumにより実施。CLI版と違い同一セッションで検証可能だった): 移動・壁判定・視界に応じた絵文字描画・戦闘(与ダメージ・被ダメージ・撃破ログ)・インベントリの開閉とその表示・コンソールエラーが出ないことを確認。アイテム使用/フロア降下/勝利画面は同一シードでの手動誘導が煩雑なため未確認 — 気になる場合は`?seed=`で潜って手元でも触ってみてほしい

自動テスト(型検査・lint・Vitest・knip)は通過済み。

## マイルストーン18 — リプレイ(初期状態+アクションログの再生)

マイルストーン1以来「`RngState`を`GameState`に含めておけばセーブ・リプレイ・シード共有がほぼ無料になる」という前提で設計してきた投資を回収する。**リプレイ=(width, height, seed) + そのセッションで実際に発行された`Action`列**。セーブ(スナップショット1個)とは別物で、`GameState.events`のような20件キャップは適用しない(リプレイの全体が要点なので切り詰めると意味がなくなる)。セーブからの再開セッションは「本当の初期状態」を持たないため、今回はリプレイ記録の対象外とする(素直な割り切り)。実機での「再生を眺めるビューア」は作らない — 決定性そのものは自動テストで検証できるので、まずは記録+再構築の核だけを実装する。

- [x] `src/game/replay.ts`(新規): `Replay`型(`{width, height, seed, actions: readonly Action[]}`)と`buildReplayGameState(replay): GameState`(初期状態を`buildDungeonGameState`で作り、`actions`を順に`advanceTurn`で畳み込むだけの純粋関数) + テスト(決定性・空アクション列は初期状態と一致・フロア降下やアイテム使用を含む長めのアクション列を実際に畳み込んで整合性を検証)
- [x] `src/game/validateGameState.ts`: `isItemKind`・`isEnemyKind`・`isPositiveInteger`・`isFiniteNumber`を`export`に変更(新設の`validateReplay.ts`と共有するため。列挙値の網羅性を1箇所に保つ)
- [x] `src/game/validateReplay.ts`(新規): `validateReplay(value): Result<Replay, string>`。`Action`判別可能unionの形状検証(`isAction`)を含む + テスト
- [x] `src/game/replayFile.ts`(新規、core側): `buildReplayFileContent`/`parseReplayFileContent`(`REPLAY_FORMAT_VERSION = 1`から開始。セーブ形式とは独立の版数)+ テスト
- [x] `src/replayFile.ts`(新規、シェル層・fs効果): `saveReplay(replay)`(上書き型・1スロット)/`loadReplay()`(セーブと違い**読んでも消費しない** — 記録の閲覧であって「再開」ではないため)+ テスト
- [x] `src/main.tsx`: 起動時にセーブから再開した場合はリプレイ記録なし(`undefined`)、新規ダンジョンの場合は`{width, height, seed, actions: []}`で開始。以降ディスパッチした`Action`を全て追記し、実行が`playing`でなくなったタイミング(死亡・勝利・終了・中断セーブ)で`saveReplay`を呼ぶ
- [x] `src/game/index.ts`: `Replay`型・`buildReplayGameState`・`parseReplayFileContent`を再エクスポート(検証スクリプトから使えるように)
- [x] `scripts/replay-verify.mjs`(新規): `~/.emoji-rogue/replay.json`を読み込み`buildReplayGameState`で再構築し、アクション数・到達フロア・最終HP・ステータスを表示するだけの手動確認用スクリプト(`scripts/demo-renderer.mjs`と同じ位置づけ)。`npm run build && node scripts/replay-verify.mjs`
- [x] パイプライン確認(このセッション内で実施): `npm run build`後、手作業で組んだ`replay.json`(`buildReplayFileContent`と同じ形式)を`~/.emoji-rogue/`に置き、`node scripts/replay-verify.mjs`が`dist/game/index.mjs`経由で正しく読み込み・再構築し、期待どおりの到達フロア/HP/ステータスを表示することを確認
- [ ] 実機確認: 実際にCLIを対話操作して遊んでから終了し、`main.tsx`が`replay.json`を書き出すこと自体を確認(Inkはraw-mode TTYが必須でこのリモート環境では対話操作そのものができないため未実施。再構築ロジック自体はテスト+上記パイプライン確認で検証済み)

自動テスト(型検査・lint・Vitest・knip)は通過済み。実機確認のみ保留のため、完了扱いはそれを確認してから。

## マイルストーン19 — CLI版でのシード指定対応

マイルストーン1の設計方針「セーブ・リプレイ・シード共有(デイリーチャレンジ)が構造的にほぼ無料になる」のうち、シード共有だけが未対応だった。ブラウザデモ(マイルストーン17)には既に`?seed=123`があるので、CLI版にも対称な`--seed=123`起動引数を追加する。引数解析は純粋関数なので**対話的なTTY操作なしでVitestだけで検証できる**。

- [x] `src/cliArgs.ts`(新規、シェル層): `parseSeedArgument(argv: readonly string[]): number | undefined`。`--seed=<正の数>`を1つ拾う純粋関数(`process.argv`は渡す側=`main.tsx`が知っていればよく、この関数自体はNode非依存)。ブラウザデモの`readSeedFromUrl`と同じ検証規則(有限の正の数のみ)に揃えた + テスト
- [x] `src/main.tsx`: `createSession`が`parseSeedArgument(process.argv.slice(2)) ?? Date.now()`でシードを決定(セーブから再開した場合はそもそもシード指定が意味を持たないため従来どおり無視)
- [x] README: `--seed=123`起動引数を遊び方に追記

自動テスト(型検査・lint・Vitest・knip)は通過済み。

## マイルストーン20 — 空腹度(食料)システム

オリジナルRogueの根幹要素の一つである「空腹度」を導入する。ここからはユーザーからの明示的な指示(2026-07-15、`/goal`)に基づき、ネット対応・シレン風NPC・仲間システムは対象外としたまま、オリジナルRogueが持つ機能を一つずつ再現していく自律運用フェーズに入る。空腹度は「時間経過(ターン経過)そのものがプレイヤーを追い詰める」という、これまでのマイルストーンにない新しい種類の圧力で、無限に安全地帯に留まるプレイを牽制する。腐乱肉のような複雑な状態異常はまだ入れず、素直な「減る→食べ物で回復→尽きると餓死」のループに留める。

- [x] `src/game/balance.ts`: `PLAYER_MAX_FOOD = 100`・`PLAYER_HUNGER_WARNING_THRESHOLD = 30`・`STARVATION_DAMAGE_PER_TURN = 1`・`FOOD_RATION_RESTORE_AMOUNT = 50`・`FOOD_COUNT_PER_FLOOR = 1`を追加
- [x] `src/game/state.ts`: `GameState`に`playerFood: number`を追加
- [x] `src/game/events.ts`: `ItemKind`に`"food"`を追加。`DeathCause = EnemyKind | "hunger"`を新設し、`player-died`のpayloadを`{by: EnemyKind}`から`{by: DeathCause}`に拡張。`GameEvent`に`player-hungry`(空腹警告に入った瞬間、1回だけ)・`player-starved`(食料0で毎ターンHPが削れる)・`player-ate`(payload: `amount`実回復量)を追加
- [x] `src/game/hunger.ts`(新規): `applyHungerTick(state): GameState` — 毎ターン`playerFood`を1減らし、警告閾値を跨いだ瞬間だけ`player-hungry`を記録、0の間は`STARVATION_DAMAGE_PER_TURN`だけ`playerHp`を削り`player-starved`を記録、HPが0以下になったら`player-died(by: "hunger")`+`status: "dead"`にする純粋関数 + テスト(閾値跨ぎの1回性・餓死・満腹時は何も起きないことを含む)
- [x] `src/game/advanceTurn.ts`: ターン消費が実際に発生する4箇所(移動成功・階段降下・待機・アイテム使用成功)全てで`applyHungerTick`を呼ぶ。`applyUseItem`に`food`分岐を追加(`playerFood`を上限クリップで回復+在庫から1個消費+`player-ate`記録) + テスト
- [x] `src/game/floor.ts`: スポーンプールから食料を`FOOD_COUNT_PER_FLOOR`個抽選(回復薬と同じ「フロアごとに保証で湧く」枠) + テスト
- [x] `src/game/initialState.ts`: 両ビルダーの初期状態に`playerFood: PLAYER_MAX_FOOD`を追加
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`food: 🍖`を追加(単一コードポイント)
- [x] `src/messages.ts`: `ITEM_NAMES`に`food: "食料"`、`player-hungry`/`player-starved`/`player-ate`の文言、`player-died`の文言を`DeathCause`で分岐(敵に倒された場合は従来どおり、餓死の場合は専用文言)するよう更新
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"food"`を追加。`playerFood`フィールドの検証(0以上`PLAYER_MAX_FOOD`以下の整数)を追加。`isGameEvent`に新規3イベントの検証ケースを追加し、`player-died`の`by`は`EnemyKind | "hunger"`を受理するよう拡張。構造変更のため**`SAVE_FORMAT_VERSION`を7に**
- [x] `src/main.tsx`: ステータスバーに空腹度表示を追加(警告閾値以下は黄色)
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): `node dist/main.mjs --seed=42/7/100`を実際に起動し、ステータスバーの「満腹度 100/100」表示と待機ターンごとの減少(100→95→…)を確認。長時間待機で複数回ゾンビ・コウモリに発見され戦闘死したことで、`player-died`のpayloadを`EnemyKind`から`DeathCause`に広げた後も敵撃破由来の死亡文言(「ゾンビにやられた……」等)が引き続き正しく表示されることを確認できた。**餓死(空腹度0からのHP減少・警告色・専用死因文言)そのものの実機確認は未達**: このダンジョン(digger生成・視界外徘徊込み)では待機75ターン程度で敵に発見され先に戦闘死する(待機は危険という既存マイルストーン4/5の設計どおりの挙動)ため、素の待機連打では餓死に到達する前に力尽きた。餓死ロジック自体は`hunger.ts`の決定的な単体テスト(閾値跨ぎの1回性・餓死イベント連鎖・満腹時no-op)で個別に検証済み

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。餓死の視覚演出(警告色・専用死因文言)の実機確認のみ上記の理由で保留のため、完了扱いはそれを確認してから。

## マイルストーン21 — 金貨とスコア

オリジナルRogue最大の記号のひとつである金貨💰を導入する。Rogueの金貨は「持ち物」ではなく踏むだけで自動回収される特殊な資源で、ゲーム終了時にその合計額がそのままスコアになる(伝統的なUnix版Rogueの"You died with N gold"のような扱い)。よってアイテム(`ItemKind`・インベントリ)の枠組みには乗せず、`items`とは独立の`goldPiles`エンティティ+`GameState.goldCollected`という累計値で表現する。持ち物の選択使用のような操作は一切なく、踏んだ瞬間に加算されて消える一方向の資源なので、実装はこれまでのアイテムより単純。

- [x] `src/game/state.ts`: `GoldPile`型(`Position & { readonly amount: number }`)と`GameState`に`goldPiles: readonly GoldPile[]`・`goldCollected: number`を追加
- [x] `src/game/events.ts`: `GameEvent`に`gold-collected`(payload: `amount`)を追加
- [x] `src/game/balance.ts`: `GOLD_PILES_PER_FLOOR = 3`・`GOLD_AMOUNT_MIN = 2`・`GOLD_AMOUNT_MAX = 20`を追加
- [x] `src/game/floor.ts`: スポーンプールから`GOLD_PILES_PER_FLOOR`個、金額は`[GOLD_AMOUNT_MIN, GOLD_AMOUNT_MAX]`からrngで抽選して配置(既存のpotion/food抽選と同じ枠組み) + テスト
- [x] `src/game/advanceTurn.ts`: 移動先に金貨があれば`goldCollected`に加算し`goldPiles`から除去、`gold-collected`を記録(アイテムと違い即時・無条件で回収 — 選択使用の概念がない) + テスト
- [x] `src/game/frame.ts`: 金貨を💰で描画(単一コードポイント) + テスト
- [x] `src/messages.ts`: `gold-collected`の文言(「◯ゴールドを手に入れた」) + テスト
- [x] `src/main.tsx`: ステータスバーに所持金を表示(常時表示 — ゲーム終了後もそのまま残るのでそれが実質的な最終スコア表示を兼ねる。専用のスコア画面は作らない=最小実装)
- [x] `src/game/validateGameState.ts`: `goldPiles`(床上・amount正整数)と`goldCollected`(0以上の整数)の検証を追加。構造変更のため**`SAVE_FORMAT_VERSION`を8に**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): `node dist/main.mjs --seed=7`で実際に金貨💰を視認し、隣接タイルへ移動して自動回収されること、ステータスバーが「💰0」→「💰9」に更新されること、ログに「9ゴールドを手に入れた」が表示されることを確認。`s`で中断セーブし、`save.json`を直接検査して`goldCollected: 9`・残り`goldPiles`2件・`formatVersion: 8`が正しく書き出されていることも確認済み

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン22 — 隠しわな(ダーツトラップ)

オリジナルRogueのもう一つの根幹要素である「わな」を導入する。Rogueのわなは踏むまで見えない(発見・解除といった要素は今回は入れない=最小実装)。今回は最も単純な1種類——矢が飛んできてダメージを受けるダーツトラップ——だけを実装し、`TrapKind`をルックアップテーブル参照にしておく(マイルストーン9のENEMY_MAX_HP方式と同じ「種類を増やすなら1エントリ追加するだけ」の形)ことで、落とし穴(トラップドア降下)や毒矢などの追加を後から差し込みやすくする。**発見後も表示しない**(踏んだ瞬間に効果を発揮して消える一方向の存在)ため、`frame.ts`への変更は不要——金貨よりもさらに単純な実装になる。プレイヤーがわなで死亡する経路も初めて生まれるため、マイルストーン20の`DeathCause`をさらに拡張する。

- [x] `src/game/events.ts`: `TrapKind = "dart"`を新設。`DeathCause`に`"trap"`を追加(`EnemyKind | "hunger" | "trap"`)。`GameEvent`に`trap-triggered`(payload: `kind`・実ダメージ`damage`)を追加
- [x] `src/game/state.ts`: `Trap`型(`Position & { readonly kind: TrapKind }`)と`GameState`に`traps: readonly Trap[]`を追加
- [x] `src/game/balance.ts`: `TRAP_COUNT_PER_FLOOR = 2`・`DART_TRAP_DAMAGE = 2`と種類→ダメージのルックアップテーブル`TRAP_DAMAGE: Readonly<Record<TrapKind, number>>`を追加
- [x] `src/game/floor.ts`: スポーンプールから`TRAP_COUNT_PER_FLOOR`個のダーツトラップを抽選(既存の金貨/アイテム抽選と同じ枠組み。位置が伏せられている以外は同じ仕組み) + テスト
- [x] `src/game/advanceTurn.ts`: 移動先に(伏せられた)わながあれば即発動——`TRAP_DAMAGE[kind]`だけ`playerHp`を削り`trap-triggered`を記録、`traps`からは即除去(一度きり)。HPが0以下なら`player-died(by: "trap")`+`status: "dead"` + テスト
- [x] `src/messages.ts`: `trap-triggered`の文言(「矢のわなを踏んでしまった。◯のダメージを受けた」)、`player-died`の`DeathCause`分岐に`"trap"`を追加(「わなにやられた……」) + テスト
- [x] `src/game/initialState.ts`: 両ビルダーの初期状態に`traps`(アリーナ版は`[]`、ダンジョン版は`layout.traps`)を追加
- [x] `src/game/validateGameState.ts`: `isTrapKind`・`isDeathCause`の更新、`traps`フィールドの検証(床上・kind検証)、`trap-triggered`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を9に**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): わなは伏せられているため通常のプレイでは事前に位置が分からない。今回はコアのBFS経路探索を使い、シード1の初期状態からわな位置までの最短経路(11手)を計算した上で`node dist/main.mjs --seed=1`を実際に操作してその経路をたどり、道中でコウモリに被弾しつつ最後にわなを踏むところまで到達させた。「矢のわなを踏んでしまった。2のダメージを受けた」のログ表示、わな由来のダメージでHPが0になり「わなにやられた……」という専用死因文言(敵撃破由来の死因と正しく区別)が表示されること、💀描画を確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン23 — 未鑑定ポーション(毒薬)

オリジナルRogueの真骨頂である「未鑑定アイテム」を導入する。今回は最小構成として、既存の回復薬💊と外見(絵文字)が全く同じ毒薬を1種追加し、「拾っただけでは・持ち物に入れただけでは種類が分からず、実際に飲むまで(またはこの実行内でその種類を一度でも鑑定するまで)判別できない」という核だけを実装する。**将来の拡張のためにあえて残す部分**: 実行ごとにランダムなフレーバーテキスト("青い薬"等)を各薬効に割り当てる方式は今回は入れない(その割り当て自体が人間向け文字列でありGameStateに直接持たせるとi18n規律に抵触するため、`messages.ts`側だけで解決できる設計になるまで保留)。今回は単に「未鑑定の薬」という共通の汎用名で表示するに留める——スコープを抑えつつ核心のゲームプレイ(見た目では善悪が分からない薬を飲むかどうかの判断)は再現できる。

- [x] `src/game/events.ts`: `ItemKind`に`"poison"`を追加。`POTION_KINDS: readonly ItemKind[] = ["potion", "poison"]`(薬効を持つ=未鑑定システム対象の種類一覧、共有ヘルパー用)を追加。`DeathCause`に`"poison"`を追加。`GameEvent`に`player-poisoned`(payload: 実ダメージ`damage`)を追加
- [x] `src/game/state.ts`: `GameState`に`identifiedPotionKinds: readonly ItemKind[]`(この実行中に一度でも鑑定=使用した薬効の一覧)を追加
- [x] `src/game/balance.ts`: `POISON_DAMAGE = 4`・`POISON_POTION_SPAWN_CHANCE_PERCENT = 30`(剣・盾と同じ独立判定の仕組み)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で毒薬を1個抽選(既存の剣・盾抽選と同じ枠組み。外見(絵文字)は回復薬と同一のため、拾った時点では区別がつかない) + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`poison`分岐を追加(`POISON_DAMAGE`だけ`playerHp`を削り`player-poisoned`を記録。HPが0以下なら`player-died(by: "poison")`+`status: "dead"`)。回復薬・毒薬のどちらを使っても、その種類を`identifiedPotionKinds`に追加(鑑定)。`use-item`アクションの実行後、毒薬で致死した場合は同ターンの敵の行動をスキップ(マイルストーン22のわな死亡ガードと同じ理由) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`poison: 💊`(回復薬と同一の絵文字——未鑑定の間は見た目で区別できないという核を絵文字レベルでも体現する)を追加
- [x] `src/messages.ts`: `formatEvent`・`formatInventoryEntry`の両方に`identifiedPotionKinds`引数を追加(核のデータに依存する表示のため、シェルから明示的に渡す形にした)。`item-picked-up`とインベントリ表示は、対象が`POTION_KINDS`に含まれ未鑑定なら共通の汎用名「未鑑定の薬」を、鑑定済みまたは薬効以外のアイテムなら実名を表示。`player-poisoned`の文言、`player-died`の`DeathCause`分岐に`"poison"`を追加(「毒薬を飲んで倒れた……」) + テスト
- [x] `src/main.tsx`・`demo/main.js`: `formatEvent`/`formatInventoryEntry`の呼び出しに`state.identifiedPotionKinds`を渡すよう更新(シグネチャ変更への追従)
- [x] `src/game/initialState.ts`: 両ビルダーの初期状態に`identifiedPotionKinds: []`を追加
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"poison"`を追加。`isDeathCause`に`"poison"`を追加。`identifiedPotionKinds`フィールドの検証(各要素が`isItemKind`)、`player-poisoned`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を10に**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で敵から距離を取った安全な経路を計算し(`node dist/main.mjs --seed=64`)、実際に毒薬を拾わせた。ログに「未鑑定の薬を拾った」と表示され、`i`キーの持ち物オーバーレイでも「a) 未鑑定の薬 x1」と汎用名で表示されること(同じフロアに湧いていた本物の回復薬💊と見た目上区別がつかないことも画面上で確認)、選択して飲むと「毒薬を飲んでしまった。4のダメージを受けた」とHPが10→6に減ること(`POISON_DAMAGE`と一致)を確認。**副次的な気づき**: `formatEvent`はイベント発生時ではなく描画のたびに現在の`identifiedPotionKinds`で評価されるため、鑑定した瞬間に過去の「未鑑定の薬を拾った」ログ行も遡って「毒薬を拾った」に表示が変わる(状態破壊やバグではなく、事後的に正体が判明したという体裁で害はないため許容する)

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン24 — 巻物第1号(テレポートの巻物)

オリジナルRogueのもう一つの主要カテゴリである「巻物」を導入する。ポーションとは違う独立したアイテム系統であることを示すのが狙いなので、今回は未鑑定システム(マイルストーン23)には乗せず、剣・盾と同じ「拾った時点で実名が分かる」素直なアイテムとして実装する。効果も最小: 使うとフロア内のランダムな床マスへ瞬間移動する(自分の現在地・敵がいるマスは除外——`GameState`の「敵は互いにも自分のマスにも重ならない」不変条件を壊さないため)。移動先にアイテム・金貨・階段・わなが偶然あっても、今回はそれらの踏破処理(拾う・自動降下・発動)は起きない——それらは`move`アクション経由の移動時にしか走らない仕組みのため、"瞬間移動"は純粋に座標を差し替えるだけに留める(この簡略化はドキュメント化して残す)。

**セーブ形式への影響なし**: `ItemKind`への`"scroll"`追加と`GameEvent`への`player-teleported`追加はどちらも列挙値の拡張のみで、`GameState`の新規フィールドを伴わない。マイルストーン9・12で確立済みの「列挙値追加だけならshape guardは検知せずSAVE_FORMAT_VERSIONは据え置き」という前例をそのまま踏襲する。

- [x] `src/game/events.ts`: `ItemKind`に`"scroll"`を追加。`GameEvent`に`player-teleported`(payload: 移動先の`x`・`y`)を追加
- [x] `src/game/balance.ts`: `SCROLL_SPAWN_CHANCE_PERCENT = 30`(剣・盾・毒薬と同じ独立判定の仕組み)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で巻物を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`scroll`分岐を追加——現在の`state.rng`から一時的にステートフルな`Rng`を起こし(`floor.ts`の`descendStairs`と同じ既存パターン)、プレイヤー自身の座標と敵が乗っている座標を除いた床マスから1つ選んで`player`をそこへ差し替え、`rng`を更新、`player-teleported`を記録 + テスト(決定性・敵のマスには絶対に着地しないことを含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`scroll: 📜`(単一コードポイント)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`scroll: "巻物"`、`player-teleported`の文言(「巻物を読んだ。テレポートした!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"scroll"`を追加。`player-teleported`イベントの検証ケース(座標が0以上の整数——イベントログは履歴情報であり床上判定までは行わない、他の座標を持たないイベントペイロードと同水準の検証に揃えた)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**(念のためshape guardテストを実行し構造不変を確認)
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で安全な経路を計算し(`node dist/main.mjs --seed=24`)、実際に巻物を拾わせた。ログに(未鑑定システムに乗らないため)最初から「巻物を拾った」と実名で表示されること、`i`キーの持ち物オーバーレイで「b) 巻物 x1」と表示されること、選択して読むとログに「巻物を読んだ。テレポートした!」と表示され、マップ全体が別の部屋(別の敵🧟が見える全く違うレイアウト)に切り替わることを確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン25 — 巻物第2号(地図の巻物)

巻物カテゴリの2種類目として、フロア全体を一気に既踏破にする「地図の巻物」を導入する。`GameState.explored`(マイルストーン3で導入済み)をそのまま使い回せるため、新規の状態フィールドは一切不要——`frame.ts`の描画ロジックも無改造で済む、これまでで最も影響範囲の小さいアイテム追加になる。テレポートの巻物(マイルストーン24)と同じく未鑑定システムには乗せず、拾った時点で実名が分かる。

- [x] `src/game/events.ts`: `ItemKind`に`"mapping"`を追加。`GameEvent`に`floor-mapped`(payloadなし、`player-hungry`と同じ形)を追加
- [x] `src/game/balance.ts`: `MAPPING_SCROLL_SPAWN_CHANCE_PERCENT = 30`(他の巻物・剣・盾と同じ独立判定の仕組み)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で地図の巻物を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`mapping`分岐を追加——現在の地形と同じ寸法の全面`true`グリッドで`explored`を丸ごと差し替え、`floor-mapped`を記録 + テスト(壁マスも含め全域が既踏破になることを含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`mapping: 🧭`(単一コードポイント。`ItemKind`網羅の`Record`型のため追加は必須だが、`explored`を使う3層描画ロジック自体は無改造)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`mapping: "地図の巻物"`、`floor-mapped`の文言(「地図の巻物を読んだ。フロア全体が明らかになった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"mapping"`を追加。`floor-mapped`イベントの検証ケース(`player-hungry`と同じくpayloadの中身は見ない)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で安全な経路を計算し(`node dist/main.mjs --seed=75`)、実際に地図の巻物を拾わせた。ログに「地図の巻物を拾った」と実名で表示され、`i`キーの持ち物オーバーレイで「a) 地図の巻物 x1」と表示されること、選択して読むとログに「地図の巻物を読んだ。フロア全体が明らかになった!」と表示されることを確認。`capture-pane -e`でANSIエスケープシーケンスごと取得して比較したところ、視界半径の外側にあるはずの遠方のマスまで含めてフロア全体に既踏破シルエット色(壁#666666・床#262626相当の256色近似)が付与されていることを確認でき、`explored`グリッドが実際に全面`true`へ差し替わったことを視覚的に裏付けられた

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン26 — 巻物第3号(識別の巻物)

飲むリスクを負わずに未鑑定ポーション(マイルストーン23)を鑑定できる「識別の巻物」を導入する。`identifiedPotionKinds`という状態は既に存在するため、この巻物は「`POTION_KINDS`のうち未鑑定の最初の1種を`identifiedPotionKinds`に加える」だけの薄い効果になる——巻物カテゴリの中でもテレポート・地図に続き最も単純な実装になる見込み。鑑定すべき対象が(すでに全種鑑定済みで)何もない場合は、アイテムを持っていないときの`use-item`と同じ「無効果・ターン消費なし・巻物も消費しない」扱いにする(同一参照を返す既存の慣習を踏襲)。

- [x] `src/game/events.ts`: `ItemKind`に`"identify"`を追加。`GameEvent`に`potion-identified`(payload: 鑑定した`kind`)を追加
- [x] `src/game/balance.ts`: `IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT = 30`(他の巻物と同じ独立判定の仕組み)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で識別の巻物を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`identify`分岐を追加——`POTION_KINDS`から`identifiedPotionKinds`に含まれない最初の種類を選び鑑定リストに追加、`potion-identified`を記録(rng不使用、決定的)。鑑定対象が無ければ`state`をそのまま返す(ターン消費なし・巻物も消費しない) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`identify: 🔍`(単一コードポイント)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`identify: "識別の巻物"`、`potion-identified`の文言(「◯の正体を見破った!」——鑑定はその瞬間に正体を明かすイベントなので`player-healed`等と同様、常に実名で表示) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"identify"`を追加。`potion-identified`イベントの検証ケース(`kind`が`isItemKind`)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で安全な経路を計算し(`node dist/main.mjs --seed=84`)、実際に識別の巻物を拾わせた。ログに「識別の巻物を拾った」と表示され、`i`キーの持ち物オーバーレイで「a) 識別の巻物 x1」と表示されること、選択して読むとログに「回復薬の正体を見破った!」と表示されること(`POTION_KINDS`の先頭=`"potion"`が決定的に選ばれた)を確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン27 — 怪力の薬(未鑑定ポーション第3種)

未鑑定ポーション(マイルストーン23)に「良い」薬効を追加し、「毒薬(悪い)1種・回復薬(中立〜良い)1種」だった構成を「回復薬・怪力の薬(良い)・毒薬(悪い)」の3すくみに広げる。効果は剣(マイルストーン13)と同じ`playerAttackDamage`の恒久加算——ただし恒久強化を提供する経路がもう1つ増える形になる。`POTION_KINDS`に追加するだけで既存の未鑑定表示・識別の巻物(マイルストーン26)がそのまま横展開される。

- [x] `src/game/events.ts`: `ItemKind`に`"strength"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-strengthened`(payload: 実加算量`bonus`)を追加
- [x] `src/game/balance.ts`: `STRENGTH_POTION_ATTACK_BONUS = 1`(剣と同じ量)・`STRENGTH_POTION_SPAWN_CHANCE_PERCENT = 30`(毒薬と同じ独立判定の仕組み)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で怪力の薬を1個抽選(見た目は回復薬・毒薬と同一のため区別がつかない) + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`strength`分岐を追加(`playerAttackDamage`に`STRENGTH_POTION_ATTACK_BONUS`を加算・`player-strengthened`を記録)。回復薬・毒薬・怪力の薬いずれを使っても`identifiedPotionKinds`に鑑定される + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`strength: 💊`(回復薬・毒薬と同一の絵文字)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`strength: "怪力の薬"`、`player-strengthened`の文言(「怪力の薬を飲んだ。攻撃力が◯上がった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"strength"`を追加。`player-strengthened`イベントの検証ケースを追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で安全な経路を計算し(`node dist/main.mjs --seed=24`)、実際に怪力の薬(未鑑定)を拾わせた。ログ・持ち物オーバーレイの両方で「未鑑定の薬」と表示され回復薬・毒薬と見分けがつかないこと、飲むとログに「怪力の薬を飲んだ。攻撃力が1上がった!」と実名+効果が表示されることを確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン28 — 盗賊(ダメージなしで金貨を盗んで逃げる敵)

オリジナルRogueのレプラコーン(妖精)に着想を得た、これまでと質の違う敵を追加する。ゾンビ・コウモリはどちらも「隣接したらプレイヤーのHPを削る」という同じ行動原理だったが、盗賊は隣接すると**ダメージを与えず金貨を盗んで即座に盤面から消える**(倒さなくても勝手にいなくなる)。マイルストーン9で確立した`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`の種類別ルックアップテーブルはそのまま使い回しつつ、`advanceEnemies`の隣接時分岐に初めて「敵種ごとに異なる効果」を持ち込む。出現数はゾンビ・コウモリのような深さスケーリングではなく、剣・盾と同じ「フロアごとの独立判定(0体か1体)」とする——レアな一撃離脱の遭遇、という原作の立ち位置に合わせるため。

- [x] `src/game/events.ts`: `EnemyKind`に`"thief"`を追加。`GameEvent`に`gold-stolen`(payload: 実盗難量`amount`)を追加
- [x] `src/game/balance.ts`: `THIEF_MAX_HP = 2`・`THIEF_ATTACK_DAMAGE = 0`(隣接時は攻撃ではなく窃盗のため未使用だが`Record<EnemyKind, number>`網羅のため必要)・`THIEF_ACTIONS_PER_TURN = 1`・`THIEF_STEAL_AMOUNT = 10`・`THIEF_SPAWN_CHANCE_PERCENT = 20`(剣・盾と同じ独立判定)を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`に`thief`のエントリを追加
- [x] `src/game/enemies.ts`: `advanceEnemies`の隣接時分岐を敵種で分け、`thief`は`Math.min(THIEF_STEAL_AMOUNT, goldCollected)`だけ盗み(`goldCollected`accumulatorを新設)、`gold-stolen`を記録し、その場で盤面から除去(`nextEnemies`に積まない=倒さなくても消える)。所持金0でも隣接すれば必ず逃げる(盗む量0でも`gold-stolen`は記録) + テスト(窃盗・除去・所持金0でのふるまい・複数体いる場合に他の敵の行動へ影響しないことを含む)
- [x] `src/game/floor.ts`: スポーンプールから低確率で盗賊を1体抽選(ゾンビ・コウモリの深さスケーリングとは別枠、剣・盾と同じ独立判定) + テスト
- [x] `src/game/frame.ts`: `ENEMY_GLYPHS`に`thief: 👺`(単一コードポイント、Unicode 6.0)を追加
- [x] `src/messages.ts`: `ENEMY_NAMES`に`thief: "盗賊"`、`gold-stolen`の文言(盗まれた量に応じて「盗賊に◯ゴールド盗まれた!」/「盗賊に襲われたが、何も盗られなかった」) + テスト
- [x] `src/game/validateGameState.ts`: `isEnemyKind`に`"thief"`を追加。`gold-stolen`イベントの検証ケースを追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): BFS経路探索で経路を計算し(`node dist/main.mjs --seed=61`)、実際に盗賊👺に隣接させた。この実行では所持金が0だったため「盗賊に襲われたが、何も盗られなかった」という無所持ケースを確認する形になったが、隣接した瞬間に👺がマップから消え(倒していないのに盤面から除去)、HPには一切ダメージが入らないこと(戦闘と質的に異なる敵であること)を確認できた。所持金を持った状態での窃盗量表示・ログ文言はユニットテスト側(`enemies.test.ts`)で決定的に検証済み

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン29 — 呪われた剣・盾

オリジナルRogueの「呪われた装備」を導入する。この実装では拾ったアイテムは`InventoryEntry`の個数カウントに合流し個体識別を失う(在庫は`{kind, quantity}`のスタックであって、個々の剣に呪いフラグを持たせる余地がない)ため、**呪いの当たり外れは装備(使用)した瞬間にその場で判定する**——スポーン時に呪いを固定してアイテム側に持たせる設計は採らない。この簡略化により`Item`の形は一切変わらず、`weapon-equipped`/`armor-equipped`イベントの`bonus`ペイロード(既存の`number`型)がそのまま負の値も表現できるため、新規のイベント種別もセーブ形式のバージョンアップも不要になる——これまでで最小の変更範囲。装備は現状「使ったら外せない」仕様なので、呪いで下がったステータスは原作同様そのまま張り付く。

- [x] `src/game/balance.ts`: `SWORD_CURSE_CHANCE_PERCENT = 20`・`SHIELD_CURSE_CHANCE_PERCENT = 20`(独立判定)・`MIN_PLAYER_ATTACK_DAMAGE = 1`(呪われた剣で攻撃力が0以下に落ちないための下限。防御力は`MIN_DAMAGE_TAKEN`により被ダメージ側で既に下限が効いているため専用の下限は不要——呪われた盾が防御力を負にすると、むしろ被ダメージが増えるという筋の通った副作用になる)を追加
- [x] `src/game/advanceTurn.ts`: `applyUseItem`の`sword`/`shield`分岐で、使用の瞬間に`state.rng`を一時的にステートフルな`Rng`に起こして呪いを判定(既存の`descendStairs`/テレポート巻物と同じパターン)。呪われていれば`bonus`が負(剣は下限`MIN_PLAYER_ATTACK_DAMAGE`でクリップ)、そうでなければ従来どおり正の`bonus`を`weapon-equipped`/`armor-equipped`に記録し、`rng`を更新 + テスト(呪い有り無し両方・剣の下限クリップ・決定性を含む)
- [x] `src/messages.ts`: `weapon-equipped`/`armor-equipped`の文言を`bonus`の符号で分岐(正なら従来どおり「上がった!」、負なら「呪われていた……◯下がった」) + テスト
- [x] `src/game/validateGameState.ts`: `weapon-equipped`の`bonus`検証を`isPositiveInteger`から「任意の整数」(`isInteger`、剣は下限クリップで実質増分が0になる場合があるため0も許容)に、`armor-equipped`は「0以外の整数」(`isNonZeroInteger`、盾には下限クリップがなく±1で固定)に緩和。`playerDefense`自体も呪われた盾で負になりうるため`isNonNegativeInteger`から`isInteger`へ緩和。ペイロード・フィールドの型自体(`number`)は変わらないため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): `state.rng`の初期ドローと`SWORD_CURSE_CHANCE_PERCENT`/`SHIELD_CURSE_CHANCE_PERCENT`の判定式を突き合わせるNodeスクリプトで、剣が確実に呪われ・盾が確実に祝福される乱数状態になる(seed, 経路)の組を事前に特定してから`node dist/main.mjs --seed=806`を実機起動。BFS経路で剣まで移動して装備すると「剣を装備したが、呪われていた……攻撃力は変わらなかった」(基礎攻撃力1が`MIN_PLAYER_ATTACK_DAMAGE`でクリップされ実質増減なし)が表示され、続けて盾まで移動して装備すると「盾を装備した。防御力が1上がった!」が表示され、呪い有り/無し両方の文言分岐と実際のステータス変化を同一セッションで確認できた(道中は戦闘なし、HPは10/10のまま終始変化なし)

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン30 — 眠っている敵と奇襲(スニークアタック)

オリジナルRogueの「モンスターは最初眠っていて、近づくと確率で目覚める。まだ眠っている相手への攻撃は大ダメージの奇襲になる」を導入する。現行の`advanceEnemies`は「隣接なら攻撃、プレイヤーの視界内ならA*で追跡、それ以外は徘徊」という3分岐だったが、ここに「眠っている間は一切行動しない(徘徊もしない)」という第0分岐を追加する形で実装する。

**設計変更の経緯(実装中に判明)**: 当初は「隣接 or 視界内なら無条件かつ即座に目覚める」という単純な仕様を考えていたが、これだと実プレイでの奇襲が事実上不可能だと判明した——バンプ攻撃は「隣接マスへの移動」ではなく「敵のマス自体への移動」として発生するため、隣接した瞬間には必ずその手前の1ターンが存在し(移動でしか隣接になれない)、その到達ターンの`advanceEnemies`で即座に目が覚めてしまい、次のターンの攻撃には既に「起きている」状態で当たってしまう。そのため**毎ターン確率判定**(`WAKE_CHANCE_PERCENT`、外れれば眠ったまま=行動もしない)に変更し、隣接・視界内のどちらでも「目覚めるかもしれないが、必ずではない」とすることで、接近してすぐ攻撃すれば奇襲が成立する余地を残した。

- [x] `src/game/state.ts`: `Enemy`に`awake: boolean`を追加(構造変更)
- [x] `src/game/balance.ts`: `SNEAK_ATTACK_MULTIPLIER = 3`(原作Rogueの奇襲倍率に準拠)・`WAKE_CHANCE_PERCENT = 33`(隣接 or 視界内にいる間、毎ターン独立に判定)を追加
- [x] `src/game/floor.ts`: スポーン時の敵(ゾンビ・コウモリ・盗賊)は全て`awake: false`で生成
- [x] `src/game/enemies.ts`: `advanceEnemies`の各敵の行動判定の先頭に「隣接 or プレイヤーの視界内(既存の`visiblePoints`をそのまま流用——追跡可否の判定と同じ近似)なら`state.rng`を消費して`WAKE_CHANCE_PERCENT`で目覚め判定、外れれば(条件を満たさない場合も含め)何もせず終了」という分岐を追加。一度起きたら`awake: true`のまま(二度と眠らない、目覚め判定も二度と行わない)。目覚めた同じターン中に隣接していれば即座に攻撃/追跡に移る(既存の「隣接する敵はプレイヤーの行動後に必ず行動する」という前提をそのまま踏襲し、特別扱いはしない) + テスト(視界内・隣接それぞれの「目覚めて即行動」と「判定に外れて眠ったまま何もしない」の両方、視界外での完全な無行動を含む)
- [x] `src/game/events.ts`: `GameEvent`に`sneak-attack`(payload: `target: EnemyKind`・実ダメージ`damage`)を追加。`enemy-hit`と同形だが、奇襲時は`enemy-hit`の代わりにこちらを発火する新規イベント種別として独立させる(列挙値追加のみ)
- [x] `src/game/combat.ts`: `applyPlayerAttack`で`target.awake === false`なら`state.playerAttackDamage * SNEAK_ATTACK_MULTIPLIER`のダメージで`sneak-attack`を発火。命中対象が生き残った場合は`awake: true`に更新(奇襲を受けた敵はその場で目を覚ます) + テスト(奇襲・撃破・二撃目は通常ダメージに戻ることを含む)
- [x] `src/messages.ts`: `sneak-attack`の文言(例:「◯に不意打ち!◯のダメージを与えた!」) + テスト
- [x] `src/game/validateGameState.ts`: `enemies`の各要素に`awake`(真偽値)の検証を追加。`sneak-attack`イベントの検証ケース(`enemy-hit`と同じ形)を追加。`Enemy`の構造変更のため**`SAVE_FORMAT_VERSION`を11に** + テスト
- [x] `src/game/save.test.ts`: shape guardの`enemies`要素に`awake: "boolean"`を追記
- [x] 既存テスト(`advanceTurn.test.ts`・`combat.test.ts`・`enemies.test.ts`・`frame.test.ts`・`validateGameState.test.ts`)のEnemyフィクスチャに`awake`を追記(既存の追跡・徘徊・隣接攻撃のテストは`awake: true`で「既に起きている」状態から検証を継続し、眠り・奇襲そのものは新規テストで担当)
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): `advanceTurn`を直接呼ぶNodeスクリプトで、接近中は敵が一切動かず(眠ったまま)・隣接した瞬間に奇襲が成立する(rngのWAKE_CHANCE_PERCENT判定が接近中ずっと外れ続ける)seedと経路を事前に特定してから`node dist/main.mjs --seed=439`を実機起動。8マス接近する間ゾンビ🧟は一切動かず(HPも無傷)、隣接に踏み込む最後の一歩(バンプ攻撃)で「ゾンビに不意打ち!3のダメージを与えた!」→「ゾンビをたおした!」を確認(通常1ダメージのところ`SNEAK_ATTACK_MULTIPLIER`により3ダメージとなり、HP2のゾンビを一撃で撃破)。目覚めた後の通常攻撃(`enemy-hit`)は既存機能そのままのためユニットテストのみで確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン31 — 再生の指輪

オリジナルRogueの指輪(ring)を導入する。数ある指輪効果のうち、既存の仕組みと自然に噛み合う「再生の指輪(ring of regeneration、装備しているだけで自然にHPが回復し続ける)」をまず1種類だけ実装する(他の指輪は`docs/design.md`のバックログへ)。潜在的アイテム(未鑑定ポーション)のような鑑定の仕組みは持たせず、巻物と同じく拾った時点で実名が分かる単純な形にする(マイルストーン24の前例を踏襲)。

- [x] `src/game/events.ts`: `ItemKind`に`"ring"`を追加。`GameEvent`に`ring-equipped`(payload: `kind: ItemKind`)・`player-regenerated`(payload: 実回復量`amount`)を追加(列挙値追加のみ)
- [x] `src/game/balance.ts`: `RING_SPAWN_CHANCE_PERCENT = 15`(剣・盾と同じ独立per-floor判定)・`RING_REGEN_CHANCE_PERCENT = 20`(指輪装備中・HPが満タンでない間、毎ターン独立に判定——`WAKE_CHANCE_PERCENT`と同じ「毎ターン確率判定」の型を再利用)を追加
- [x] `src/game/state.ts`: `GameState`に`hasRingOfRegeneration: boolean`を追加(構造変更)
- [x] `src/game/floor.ts`: `RING_SPAWN_CHANCE_PERCENT`による指輪の独立per-floorスポーンを追加 + テスト
- [x] `src/game/regeneration.ts`(新規、`hunger.ts`と対になるファイル): `applyRegenerationTick(state)` — `hasRingOfRegeneration`かつHPが満タン未満なら`state.rng`を一時的にステートフルな`Rng`に起こして`RING_REGEN_CHANCE_PERCENT`判定、成功すればHP+1と`player-regenerated`を記録(外れてもrngは進める、`descendStairs`/呪い判定と同じ「毎回rngは消費するが結果に関わらず状態を返す」パターン) + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`ring`分岐(`hasRingOfRegeneration`を`true`にして`ring-equipped`を記録。既に装備済みでも再度使うと消費されるだけで効果に変化はない——剣・盾のような際限ない加算効果ではなく単なるオンオフなため)を追加。`applyHungerTick`を呼んでいる全箇所(move/wait/use-item)に`applyRegenerationTick`も追加で呼ぶ + テスト
- [x] `src/messages.ts`: `ring-equipped`(例:「指輪を身につけた。じわじわとHPが回復するようになった!」)・`player-regenerated`(例:「指輪の力でHPが1回復した」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"ring"`を追加。`hasRingOfRegeneration`(真偽値)の検証、`ring-equipped`/`player-regenerated`イベントの検証ケースを追加。`GameState`の構造変更のため**`SAVE_FORMAT_VERSION`を12に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`hasRingOfRegeneration: "boolean"`を追記
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`ring: 💍`(単一コードポイント、Unicode 6.0)を追加
- [x] tmux-PTY実機確認(2026-07-15、このセッション内で実施): 罠を踏んでHPを減らしてから指輪を拾い装備し、その後1ターン待つとHPが自然回復する(seed, 経路)の組をNodeスクリプトで事前に特定してから`node dist/main.mjs --seed=1273`を実機起動。矢のわなを踏んでHP8/10になった後、指輪💍を拾って装備すると「指輪を身につけた。じわじわとHPが回復するようになった!」表示になり、続けて1ターン待つとHPが9/10に回復し「指輪の力でHPが1回復した」を確認

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。

## マイルストーン32 — イェンダーの魔除け(往復による真の勝利条件)

これまでの勝利条件(`GOAL_FLOOR`到達で即勝利)は、オリジナルRogueの核——最深部でイェンダーの魔除けを手に入れ、地上まで生きて持ち帰る——を再現していなかった。今回、`GOAL_FLOOR`を「魔除けが眠る最深部」に意味を変え、そこに上り階段だけを置いて魔除けを配置し、往路(降りる)と復路(昇る)を対称な仕組みで実装する。**フロアは一切保存しない**という既存方針(降りるたびに新規生成)をそのまま踏襲し、昇るときも同様に毎回新規生成する——「同じ階に戻る」概念自体を持たせない設計にすることで、`GameState`に往復の履歴を持たせずに済む(実装コストを大きく下げる簡略化)。フロア1に戻った瞬間(上り階段を昇った先が1階未満になった瞬間)をゲーム終了の境界とし、魔除けを持っていれば勝利、持っていなければ(`quit`と同じ)`exited`で終える——後者に専用の敗北演出は設けない(原作でも道中撤退はただの中断であり死亡ではないため)。

- [x] `src/game/state.ts`: `Stairs = Position & { readonly direction: "up" | "down" }`を新設し`GameState.stairs`の型を`Position`から`Stairs`に変更。`GameState`に`amulet: Position | undefined`(現在のフロアに落ちている間だけ存在。原作同様1個のみ)と`hasAmulet: boolean`(一度手に入れたら永続、装備アイテムのような使用行為はない)を追加
- [x] `src/game/events.ts`: `GameEvent`に`amulet-obtained`(payloadなし)・`floor-ascended`(payload: `floor`、`floor-descended`と対称)を追加。`game-won`のpayloadを`{floor: number}`から`Record<string, never>`に変更(勝利は常に「地上に生還」を意味するようになり、階数を運ぶ意味がなくなったため)
- [x] `src/game/floor.ts`: `FloorLayout.stairs`を`Stairs`型に、`amulet: Position | undefined`を追加。`buildFloorLayout`に`stairsDirection: "up" | "down"`引数を追加(通常は渡された向きをそのまま使うが、**`floor === GOAL_FLOOR`のときは強制的に`"up"`**にし、階段の代わりに魔除けを1個確定配置する——他アイテムと違い抽選ではなく必ず出現)。`descendStairs`は`nextFloor === GOAL_FLOOR`のときだけ`stairsDirection: "up"`で生成し、それ以外は`"down"`(**即勝利分岐を撤去** — `GOAL_FLOOR`はもう終着点ではなく実際に歩けるフロアになる)。新規`ascendStairs(state)`: `nextFloor = state.floor - 1`。`nextFloor <= 1`なら新しいフロアを生成せず終了——`state.hasAmulet`なら`status: "won"`+`game-won`イベント、そうでなければ`status: "exited"`(`quit`と同じ、専用イベントなし)。それ以外は`buildFloorLayout(..., "up")`で生成し`floor-ascended`イベントを記録(`descendStairs`と対称の構造) + テスト(往路は従来どおり・`GOAL_FLOOR`到達で魔除けと上り階段が出ること・復路の各段で新規フロアが生成されること・魔除け無しで1階を割ると`exited`・魔除け持ちで1階を割ると`won`であることを含む)
- [x] `src/game/initialState.ts`: `buildArenaGameState`・`buildDungeonGameState`の両方で`stairs`に`direction: "down"`を付与、`amulet: undefined`・`hasAmulet: false`を初期化。`pickArenaStairs`の戻り値型を`Stairs`にするか、呼び出し側で`direction: "down"`を付与
- [x] `src/game/advanceTurn.ts`: `applyMove`の階段判定を`state.stairs.direction === "up" ? ascendStairs(state) : descendStairs(state)`に変更。新規`applyAmuletPickup`(金貨と同じ「移動先に落ちていたら即座に拾って`hasAmulet: true`にし`amulet-obtained`を記録」)を、地形踏破の効果チェーン(わな→金貨→アイテム→……)に追加 + テスト
- [x] `src/game/frame.ts`: `STAIRS_CELL`を`STAIRS_GLYPHS: Readonly<Record<"up" | "down", Cell>>`(`down: 🔽`・`up: 🔼`、どちらも単一コードポイント・Unicode 6.0)に置き換え、`state.stairs.direction`で参照を切り替える。魔除け(`amulet`)を💎(単一コードポイント)で描画するオーバーレイを追加(重なり優先度: 金貨<アイテム<魔除け<階段<敵<プレイヤー。シルエット記憶なし=他アイテムと同じ扱い) + テスト
- [x] `src/messages.ts`: `amulet-obtained`(「イェンダーの魔除けを手に入れた!」)・`floor-ascended`(「◯階に上がった」)の文言を追加。`game-won`の文言をpayload変更に合わせて「イェンダーの魔除けを手に地上に帰還した!」に更新 + テスト
- [x] `src/game/validateGameState.ts`: `stairs`の検証に`direction`(`"up" | "down"`)を追加、`amulet`(`Position | undefined`、存在するなら床上)・`hasAmulet`(真偽値)の検証を追加。`game-won`イベントのpayload検証を(`floor-mapped`と同じ)空payload許容に変更、`amulet-obtained`・`floor-ascended`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を13に** + テスト
- [x] `src/game/save.test.ts`: shape guardの`stairs`に`direction: "string"`、トップレベルに`amulet: undefined`・`hasAmulet: "boolean"`を追記
- [x] パイプライン確認: `npm run build`後、Nodeスクリプトで`buildDungeonGameState`→`descendStairs`を`GOAL_FLOOR`まで連打して魔除けと上り階段が実際に生成されることを確認し、続けて`ascendStairs`を1階を割るまで連打して`hasAmulet`の有無で`won`/`exited`が正しく分岐することを確認する(このセッションはリモート環境のためインタラクティブなtmux実機確認の代わりに、milestone 15/18と同じ「dist経由のスクリプト直接呼び出し」で代替する)

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、seed 12345で1階からGOAL_FLOOR(10階)まで連続降下→階段が"up"に強制され魔除けが出現→拾って`hasAmulet: true`→GOAL_FLOOR-1から1階まで連続上昇(各段で新規フロア生成)→`status: "won"`+`game-won`イベントを確認。別seedで魔除けなしのまま2階から1階へ上がるケースも`status: "exited"`(勝利イベントなし)になることを確認。

**マイルストーン32完了(2026-07-15)。**

## マイルストーン33 — 満腹の指輪(2種類目の指輪効果)

バックログの「他の指輪効果の追加」に着手する最初の1件。再生の指輪(マイルストーン31)は`playerHp`を回復する効果だったが、今回は原作Rogueの"ring of slow digestion"に相当する、空腹の進みを遅らせる指輪を追加する。単純な恒久加算(剣・盾)の追加コピーにはせず、`hunger.ts`の`applyHungerTick`に「装備中は確率で空腹ティックそのものをスキップする」という新しい種類の作用を持ち込むことで、指輪という枠組みがHP回復以外にも展開できることを示す。バックログの判断ポイント(単純名称のままか鑑定リストに切り替えるか)は**単純名称のまま**を選ぶ——再生の指輪と同様、拾った時点で実名が分かる(未鑑定システムはポーションだけの枠組みとして温存する)。`ring-equipped`イベントの`payload.kind`は元から`ItemKind`型で指輪の種類を問わず汎用だったため、イベント・セーブ形式への影響はGameStateに1フィールド足す分だけで済む。
	
- [x] `src/game/events.ts`: `ItemKind`に`"sustenance"`を追加(列挙値追加のみ)
- [x] `src/game/state.ts`: `GameState`に`hasRingOfSustenance: boolean`を追加(`hasRingOfRegeneration`と対称、構造変更)
- [x] `src/game/balance.ts`: `SUSTENANCE_RING_SPAWN_CHANCE_PERCENT = 15`(再生の指輪と同じ独立per-floor判定)・`SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT = 50`(装備中、毎ターン独立に判定——外れれば通常どおり空腹ティックが起きる)を追加
- [x] `src/game/floor.ts`: `RING_SPAWN_CHANCE_PERCENT`による指輪抽選とは独立に、`SUSTENANCE_RING_SPAWN_CHANCE_PERCENT`で満腹の指輪を抽選 + テスト
- [x] `src/game/hunger.ts`: `applyHungerTick`の先頭に「`hasRingOfSustenance`なら`state.rng`を一時的にステートフルな`Rng`に起こして`SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT`判定、成功すれば空腹ティックそのものを丸ごとスキップ(食料もHPも変化なし、イベントなし)、外れれば通常どおり進める」を追加(`hasRingOfRegeneration`でない通常時はrngを一切消費しない既存の決定的経路を維持) + テスト(スキップ成功・失敗・指輪なしでの無変更を含む)
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`sustenance`分岐(`hasRingOfSustenance`を`true`にして`ring-equipped`を記録。既存の`ring`分岐と対称) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`sustenance: 💍`(再生の指輪と同一の絵文字——未鑑定システムには乗らないため実名は拾った時点で分かるが、地面の見た目は指輪同士で共通にする)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`sustenance: "指輪"`(既存の`ring`と同じ汎用名——どちらの効果かは装備するまで名前からは分からない、という既存の割り切りをそのまま踏襲)を追加。`ring-equipped`の文言を`payload.kind`で分岐(`sustenance`なら「指輪を身につけた。空腹の進みがゆるやかになった!」、それ以外は既存の再生文言) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"sustenance"`を追加。`hasRingOfSustenance`(真偽値)の検証を追加。構造変更のため**`SAVE_FORMAT_VERSION`を14に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`hasRingOfSustenance: "boolean"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、満腹の指輪を装備した状態と装備していない状態それぞれで`advanceTurn`(wait)を多数回実行し、指輪ありの方が`playerFood`の減少ペースが約半分になることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、satiety ring装備ありなし双方で`buildArenaGameState(9,9,1)`から`wait`を50ターン連続実行し、装備なしは50食料消費(1ターン1消費どおり)、装備ありは21食料消費(比率0.42、期待値0.5に近い確率的挙動)であることを確認。

**マイルストーン33完了(2026-07-15)。**

## マイルストーン34 — 落とし穴(2種類目のわな・強制フロア降下)

わな(マイルストーン22)の2種類目として、踏むと強制的に次のフロアへ落下する落とし穴を追加する。ダメージは0固定(原作でも一撃の脅威というより「不本意な降下」自体が罰則)。**新しい降下ロジックは作らない** — `floor.ts`の`descendStairs(state)`は「今いるフロアを次の階に丸ごと差し替える」純粋関数として既に自己完結しており、階段を踏んで呼ばれるかわなを踏んで呼ばれるかを区別しない。よって`advanceTurn.ts`の`applyTrapTrigger`は、trapdoor系のわなが発動しプレイヤーが生存していれば、わな自身の`trap-triggered`イベントを積んだ状態でそのまま`descendStairs`に渡すだけでよい——GOAL_FLOOR到達時の魔除け配置・上り階段強制もdescendStairs側の既存ロジックがそのまま効く。GOAL_FLOOR(最深部、これより下がない)に落とし穴が湧くと`descendStairs`が11階を生成してしまい深さの上限が壊れるため、**GOAL_FLOOR では落とし穴を抽選しない**(既存の下り階段強制"up"と同じ理由の除外)。

- [x] `src/game/events.ts`: `TrapKind`に`"trapdoor"`を追加(列挙値追加のみ、`trap-triggered`イベントの形は不変)
- [x] `src/game/balance.ts`: `TRAPDOOR_DAMAGE = 0`・`TRAPDOOR_SPAWN_CHANCE_PERCENT = 15`(剣・盾と同じ独立per-floor判定)を追加し、`TRAP_DAMAGE`に`trapdoor: TRAPDOOR_DAMAGE`を追加
- [x] `src/game/floor.ts`: `TRAP_COUNT_PER_FLOOR`個のダーツとは別枠で、**`floor !== GOAL_FLOOR`のときだけ**`TRAPDOOR_SPAWN_CHANCE_PERCENT`で落とし穴を1個抽選 + テスト(GOAL_FLOORでは湧かないことを含む)
- [x] `src/game/advanceTurn.ts`: `applyTrapTrigger`で、わな発動後もプレイヤーが生存していて発動したわなが`trapdoor`なら、その時点の状態を`descendStairs`に渡して返す(通常のダーツはこれまでどおり状態を返すだけ) + テスト(落下でフロアが進むこと・道連れの敵ターンが起きないこと・GOAL_FLOOR到達時の魔除け配置もdescendStairs経由でそのまま効くことを含む)
- [x] `src/messages.ts`: `TRAP_NAMES`に`trapdoor: "落とし穴"`を追加。`trap-triggered`の文言をダメージ0のときは「◯を踏んでしまった!」(ダメージ節を省略)に分岐(将来の0ダメージわなにも一般化できる形) + テスト
- [x] `src/game/validateGameState.ts`: `isTrapKind`に`"trapdoor"`を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、`traps`に落とし穴を1個仕込んだ状態を用意し、そこへ`advanceTurn`(move)で踏ませて`floor`が1つ進み`trap-triggered`→`floor-descended`の順でイベントが積まれることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、seed 12345で落とし穴を仕込んだ状態に`advanceTurn`(move)で踏ませ、ダメージ0のまま`floor`が1つ進み、`trap-triggered`→`floor-descended`の順でイベントが積まれることを確認。

**マイルストーン34完了(2026-07-15)。**

## マイルストーン35 — ニンフ(アイテムを盗んで消える敵)

盗賊(マイルストーン28、金貨を盗んで消える)と対になる、原作Rogueのニンフ(nymph)に着想を得た敵を追加する。盗賊が`goldCollected`を狙うのに対し、ニンフは`inventory`から持ち物を1つランダムに盗んで消える——「ダメージを与えず、隣接した瞬間に何かを奪って盤面から消える」という行動原理そのものは盗賊と同一なので、`advanceEnemies`の実装は盗賊分岐のすぐ隣に追加するだけで済む。持ち物が空でも隣接すれば必ず逃げる(盗賊の「所持金0でも逃げる」と同じ割り切り)ため、`item-stolen`イベントは「盗んだ種類」を`ItemKind | undefined`(何も持っていなかった場合)で表現する——`GameState.amulet`で確立済みの「undefinedはJSON上ではキー自体が消える」という扱いをイベントpayloadにも初めて適用する形になる。盗む対象の抽選(在庫が複数種類あるときどれを盗むか)は初めて`advanceEnemies`内でrngを消費する非決定的な選択になるため、`stepUniform`(徘徊と同じ関数)を使う。

- [x] `src/game/events.ts`: `EnemyKind`に`"nymph"`を追加。`GameEvent`に`item-stolen`(payload: `kind: ItemKind | undefined`)を追加
- [x] `src/game/balance.ts`: `NYMPH_MAX_HP = 1`・`NYMPH_ATTACK_DAMAGE = 0`(隣接時は攻撃ではなく窃盗のため未使用だが`Record<EnemyKind, number>`網羅のため必要、盗賊と同じ扱い)・`NYMPH_ACTIONS_PER_TURN = 1`・`NYMPH_SPAWN_CHANCE_PERCENT = 20`(盗賊と同じ独立per-floor判定)を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`に`nymph`のエントリを追加
- [x] `src/game/enemies.ts`: `advanceEnemies`に`inventory`のローカルアキュムレータ(`goldCollected`と同じパターン)を追加。隣接時分岐に`nymph`ケースを追加——`inventory`が空でなければ`stepUniform(rng)`でどのスタックを盗むか一様に選び、1個減算(0になったらスタックごと除去)して`item-stolen`(盗んだ`kind`)を記録、空なら`item-stolen`(`kind: undefined`)を記録するだけ。どちらも盗賊と同じく`fled = true`で盤面から除去 + テスト(単一スタック・複数スタックからの抽選・在庫空・他の敵の行動に影響しないことを含む)
- [x] `src/game/floor.ts`: スポーンプールから低確率でニンフを1体抽選(盗賊と同じ独立per-floor判定、深さスケーリングなし) + テスト
- [x] `src/game/frame.ts`: `ENEMY_GLYPHS`に`nymph`のエントリを追加——実装時に🧚(妖精)がUnicode 10.0(単一コードポイントだが「最近追加された絵文字は避ける」というdocs/design.mdの安定性規律に抵触)と判明したため、`👻`(幽霊・Unicode 6.0)に変更した(「現れて盗んで消える」という原作ニンフの挙動には幽霊の方がむしろ合う)
- [x] `src/messages.ts`: `ENEMY_NAMES`に`nymph: "ニンフ"`を追加。`item-stolen`の文言(盗まれたものがあれば`resolveItemDisplayName`で名前を出して「ニンフに◯を盗まれた!」、何もなければ「ニンフに襲われたが、何も盗られなかった」——盗賊の`gold-stolen`文言分岐と対称) + テスト
- [x] `src/game/validateGameState.ts`: `isEnemyKind`に`"nymph"`を追加。`item-stolen`イベントの検証ケース(`payload.kind`が`undefined`または`isItemKind`)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、複数種類のアイテムを持った状態でニンフに隣接させ、`inventory`から1種類が減っていること・`item-stolen`イベントに盗まれた種類が記録されること・ニンフが盤面から消えることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、回復薬・剣を持った状態でニンフに隣接させ、片方のスタックが在庫から丸ごと消え(`item-stolen`イベントに盗まれた種類が記録され)、ニンフが盤面から消えることを確認。

**マイルストーン35完了(2026-07-15)。**

## マイルストーン36 — 武器強化の巻物(呪いなしの攻撃力強化ルート)

オリジナルRogueの"scroll of enchant weapon"を導入する。剣(マイルストーン13)は拾って使うと`playerAttackDamage`が恒久的に上がるが、呪われた剣(マイルストーン29)により使用時に20%の確率で逆効果になるリスクを背負っている。武器強化の巻物は同じ`playerAttackDamage`加算効果を持ちながら**呪いを一切判定しない**——巻物カテゴリ(テレポート・地図・識別)は原作でもそもそも呪われた巻物という概念自体を今回は導入していないため、この特性は自然に手に入る。「リスクのある拾い物(剣)」と「安全だが巻物なので他の巻物同様レアな(強化の巻物)」という2つの成長ルートが並立することになる。イベントは`weapon-equipped`を再利用せず(装備の「呪いで下がることもある」文脈と混ざるのを避けるため)、常に正の加算だけを表す新規`weapon-enchanted`を新設する。

- [x] `src/game/events.ts`: `ItemKind`に`"enchant-weapon"`を追加。`GameEvent`に`weapon-enchanted`(payload: 実加算量`bonus`)を追加(列挙値追加のみ)
- [x] `src/game/balance.ts`: `ENCHANT_WEAPON_BONUS = 1`(剣と同じ量)・`ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT = 20`(他の巻物と同じ独立per-floor判定)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で武器強化の巻物を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`enchant-weapon`分岐(呪い判定なしで`playerAttackDamage`に`ENCHANT_WEAPON_BONUS`を無条件加算・`weapon-enchanted`を記録。rng不使用、決定的) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`"enchant-weapon": ⚡`(単一コードポイント、他の巻物系アイテムと絵柄がかぶらない独自glyph)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`"enchant-weapon": "武器強化の巻物"`、`weapon-enchanted`の文言(「武器強化の巻物を読んだ。攻撃力が◯上がった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"enchant-weapon"`を追加。`weapon-enchanted`イベントの検証ケース(`bonus`が正の整数)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、武器強化の巻物を持った状態で`use-item`アクションを実行し、`playerAttackDamage`が加算され`weapon-enchanted`イベントが記録されること(呪いによる減算が絶対に起きないこと)を確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、剣の呪い判定を確実に引くseed 1で武器強化の巻物を3回連続使用し、`playerAttackDamage`が+3・rngが一切変化しない(呪い判定が起きない)・3件の`weapon-enchanted`イベントが記録されることを確認。

**マイルストーン36完了(2026-07-15)。**

## マイルストーン37 — 防具強化の巻物(呪いなしの防御力強化ルート)

マイルストーン36(武器強化の巻物)と対称に、盾の呪いリスクなしで`playerDefense`を上げる巻物を追加する。実装は前回の型をそのまま踏襲するだけ——新規の設計判断は発生しない見込み。

- [x] `src/game/events.ts`: `ItemKind`に`"enchant-armor"`を追加。`GameEvent`に`armor-enchanted`(payload: 実加算量`bonus`)を追加(列挙値追加のみ)
- [x] `src/game/balance.ts`: `ENCHANT_ARMOR_BONUS = 1`(盾と同じ量)・`ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 20`(武器強化の巻物と同じ独立per-floor判定)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で防具強化の巻物を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`enchant-armor`分岐(呪い判定なしで`playerDefense`に`ENCHANT_ARMOR_BONUS`を無条件加算・`armor-enchanted`を記録。rng不使用、決定的) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`"enchant-armor"`のglyphを追加(武器強化の⚡とかぶらない別の単一コードポイント絵文字)
- [x] `src/messages.ts`: `ITEM_NAMES`に`"enchant-armor": "防具強化の巻物"`、`armor-enchanted`の文言(「防具強化の巻物を読んだ。防御力が◯上がった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"enchant-armor"`を追加。`armor-enchanted`イベントの検証ケース(`bonus`が正の整数)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、防具強化の巻物を持った状態で`use-item`アクションを実行し、`playerDefense`が加算され`armor-enchanted`イベントが記録されること(呪いによる減算が絶対に起きないこと)を確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、盾の呪い判定を確実に引くseed 1で防具強化の巻物を3回連続使用し、`playerDefense`が+3・rngが一切変化しない(呪い判定が起きない)・3件の`armor-enchanted`イベントが記録されることを確認。

**マイルストーン37完了(2026-07-15)。**

## マイルストーン38 — アクエーター(防具を錆びさせる敵)

これまでの敵は「ダメージを与える(ゾンビ・コウモリ)」か「盗んで逃げる(盗賊・ニンフ)」のどちらかだったが、原作Rogueのアクエーター(Aquator)に着想を得て「居座って攻撃し続けながら、確率で追加の副作用(防具の劣化)を与える」という3つ目の行動原理を導入する。逃げも消えもしない点でゾンビ・コウモリの仲間だが、通常ダメージに加えて`AQUATOR_RUST_CHANCE_PERCENT`の確率で`playerDefense`を1下げる——盾で積んだ防御力を溶かしていく持続的な脅威になる。深さスケーリングはせず盗賊・ニンフと同じ独立per-floor抽選とする(原作でも中層以降に出る中堅モンスターであり、ゾンビ・コウモリのような雑魚湧きにはしない)。

- [x] `src/game/events.ts`: `EnemyKind`に`"aquator"`を追加。`GameEvent`に`armor-rusted`(payload: 実減少量`amount`。`player-hit`と同じターンに追加で1件積む形——`player-hit`自体の形は変えない)を追加
- [x] `src/game/balance.ts`: `AQUATOR_MAX_HP = 3`(居座って戦うため他より頑丈)・`AQUATOR_ATTACK_DAMAGE = 1`・`AQUATOR_ACTIONS_PER_TURN = 1`・`AQUATOR_RUST_CHANCE_PERCENT = 33`(隣接攻撃が命中するたびに独立判定、`WAKE_CHANCE_PERCENT`と同じ規模感)・`AQUATOR_SPAWN_CHANCE_PERCENT = 20`(盗賊・ニンフと同じ独立per-floor判定)を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`に`aquator`のエントリを追加
- [x] `src/game/enemies.ts`: `advanceEnemies`に`playerDefense`のローカルアキュムレータ(`goldCollected`/`inventory`と同じパターン)を追加し、ダメージ計算の`state.playerDefense`参照をこのローカル変数に置き換える(同ターン内で複数回被弾しても劣化が反映されるように)。隣接攻撃が通常どおり命中した後、`enemy.kind === "aquator"`なら`state.rng`を消費して`AQUATOR_RUST_CHANCE_PERCENT`判定し、成功すれば`playerDefense`を1減らして`armor-rusted`を記録(下限なし——呪われた盾で既に負値を許容している設計をそのまま踏襲) + テスト(錆びる・錆びない両方、他の敵種では発動しないこと、同ターン複数回被弾での累積を含む)
- [x] `src/game/floor.ts`: スポーンプールから低確率でアクエーターを1体抽選(盗賊・ニンフと同じ独立per-floor判定、深さスケーリングなし) + テスト
- [x] `src/game/frame.ts`: `ENEMY_GLYPHS`に`aquator: 🐙`(単一コードポイント、Unicode 6.0)を追加
- [x] `src/messages.ts`: `ENEMY_NAMES`に`aquator: "アクエーター"`を追加。`armor-rusted`の文言(「防具が錆びついた!防御力が◯下がった」) + テスト
- [x] `src/game/validateGameState.ts`: `isEnemyKind`に`"aquator"`を追加。`armor-rusted`イベントの検証ケース(`amount`が正の整数)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、アクエーターに隣接した状態で`wait`を複数ターン実行し、`playerDefense`が徐々に下がっていくこと・`armor-rusted`イベントが記録されること・アクエーターが逃げずに居座り続けることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、seed 1でアクエーターに隣接させ`wait`を3ターン実行し、1ターン目で`armor-rusted`が発生して`playerDefense`が-1になり、2ターン目以降はその劣化を反映してダメージが1→2に増えること、3ターンを通じてアクエーターが盤面に居座り続ける(盗賊・ニンフのように消えない)ことを確認。

**マイルストーン38完了(2026-07-15)。**

## マイルストーン39 — 命中の杖(遠隔攻撃・初のアイテムカテゴリ=杖)

原作Rogueの杖(wand)カテゴリを導入する。原作の杖は方向指定で狙いを付けるが、本実装は移動同様シンプルな単一キー操作を保っている(`docs/design.md`のUI方針)ため、狙い先UIを新設せず**視界内で最も近い敵を自動的に狙う**簡略化を採る——巻物・指輪と同じく「新しいUIを増やさず既存の`use-item`一発で完結させる」という一貫した方針の延長。視界内に敵が1体もいなければ、識別の巻物(マイルストーン26)の「対象が無ければ無効果」と同じ扱い(ターン消費なし・杖も消費しない)にする。倒す/生き残らせるロジックは`combat.ts`の`applyPlayerAttack`とほぼ同型だが、固定ダメージ(睡眠中でも不意打ち倍率は乗らない——安全な遠隔の代わりに近接ほどの一撃必殺は狙えない、というリスク・リターンの差別化)・命中対象は必ず起こす、という点が異なるため独立した関数として実装する。

- [x] `src/game/events.ts`: `ItemKind`に`"wand"`を追加。`GameEvent`に`wand-struck`(payload: `target: EnemyKind`・実ダメージ`damage`。`enemy-hit`と同形だが、"詠唱で発動する遠隔攻撃"という別の物語的瞬間として独立させる——`sneak-attack`が`enemy-hit`から独立しているのと同じ理由)を追加
- [x] `src/game/balance.ts`: `WAND_STRIKE_DAMAGE = 3`(近接の基礎攻撃力より高い——遠隔の安全さと引き換えに一撃必殺(不意打ち倍率)を狙えない代償)・`WAND_SPAWN_CHANCE_PERCENT = 15`(指輪と同じレア度の独立per-floor判定)を追加
- [x] `src/game/combat.ts`: `applyWandStrike(state, target)`(`applyPlayerAttack`と同型だが、ダメージは`state.playerAttackDamage`ではなく固定の`WAND_STRIKE_DAMAGE`、不意打ち倍率なし、命中した対象は生死問わず`awake: true`になる) + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で杖を1個抽選 + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`wand`分岐——`computeVisiblePoints`(既存のvision.tsユーティリティ)で視界内の敵を絞り込み、マンハッタン距離が最小の1体を選んで`applyWandStrike`。視界内に敵がいなければ`state`をそのまま返す(識別の巻物と同じ無効果パターン) + テスト(命中・撃破・視界内に敵なしでの無効果・視界外の敵は狙われないことを含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`wand: 🔮`(単一コードポイント、Unicode 6.0)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`wand: "命中の杖"`、`wand-struck`の文言(「杖から放たれた力が◯を貫いた!◯のダメージを与えた!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"wand"`を追加。`wand-struck`イベントの検証ケース(`enemy-hit`と同じ形)を追加。列挙値追加のみのため**`SAVE_FORMAT_VERSION`は据え置き**
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、プレイヤーから離れた(隣接していない)視界内の敵に対して杖を使い、`enemies`が更新される(ダメージまたは撃破)こと・`wand-struck`イベントが記録されることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、プレイヤーから3マス離れた(隣接していない)視界内のゾンビに杖を使い、プレイヤーが移動せずに`WAND_STRIKE_DAMAGE`(3)ダメージが入り`wand-struck`イベントが記録されること、視界内に敵がいない状態では`state`が変化せず消費もされない(同一参照)ことを確認。

**マイルストーン39完了(2026-07-15)。**

## マイルストーン40 — 混乱の薬(初のプレイヤー一時状態異常)

これまでの薬・巻物・指輪はすべて「即座に・恒久的に」効果を発揮するものだった。原作Rogueの混乱の薬(potion of confusion)に着想を得て、初めて「一定ターン数だけ効果が続く一時的な状態異常」を導入する。混乱中は`move`アクションの意図した方向を無視し、rngで選んだランダムな方向に代わりに動く(壁にぶつかっても——通常なら「壁バンプはターン消費なし」だが、混乱中はランダム方向を選ぶ過程でrngを消費するため、結果として同一参照を返さずターンを消費する。「壁にぶつかって足踏みする」という原作の不確実さがここから自然に生まれる)。未鑑定ポーション(マイルストーン23)の4種類目として、既存の`POTION_KINDS`にそのまま乗る。

- [x] `src/game/events.ts`: `ItemKind`に`"confusion"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-confused`(payload: 継続ターン数`turns`)・`confusion-faded`(payloadなし、`floor-mapped`と同じ形)を追加
- [x] `src/game/state.ts`: `GameState`に`confusedTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `CONFUSION_POTION_DURATION = 10`・`CONFUSION_POTION_SPAWN_CHANCE_PERCENT = 30`(毒薬・怪力の薬と同じ独立per-floor判定)を追加
- [x] `src/game/confusion.ts`(新規、`hunger.ts`/`regeneration.ts`と対になるファイル): `applyConfusionTick(state)` — `confusedTurnsRemaining`を1減らし(下限0)、1→0に落ちた瞬間だけ`confusion-faded`を記録する純粋関数。rng不使用(継続ターン数の消費自体は決定的) + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で混乱の薬を1個抽選(毒薬・怪力の薬と同じ枠組み。見た目は回復薬と同一) + テスト
- [x] `src/game/advanceTurn.ts`: `applyMove`の先頭で`state.confusedTurnsRemaining > 0`なら`stepUniform`で4方向から1つランダムに選び、プレイヤーが指定した方向の代わりにそちらを使う(rngを消費するため、壁に当たっても状態は同一参照にならず、結果的にターンを消費する)。`applyUseItem`に`confusion`分岐(`confusedTurnsRemaining`を`CONFUSION_POTION_DURATION`にセットし`player-confused`を記録。鑑定は他の未鑑定ポーションと同じ扱い)を追加。move/wait/use-itemの3箇所すべてで`applyConfusionTick`を(`applyHungerTick`/`applyRegenerationTick`と並べて)呼ぶ + テスト(意図しない方向への移動・意図しない方向にいた敵へのバンプ攻撃・壁方向を引いた場合にターンが消費されること・鑑定・継続ターン数の減衰を含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`confusion: 💊`(回復薬・毒薬・怪力の薬と同一の絵文字——未鑑定のため)を追加。混乱状態そのものの描画表現は持たせない(プレイヤー内部状態であり、ステータスバー表示は`main.tsx`側の対象)
- [x] `src/main.tsx`: ステータスバーに混乱中であることを示す表示を追加(`満腹度`と同様の1項目。原作は視覚エフェクトを持つが、絵文字グリッドを崩さないテキスト表示に留める)
- [x] `src/messages.ts`: `ITEM_NAMES`に`confusion: "混乱の薬"`(未鑑定時は他の薬効同様「未鑑定の薬」)、`player-confused`(「◯を飲んだ。頭がくらくらする!」)・`confusion-faded`(「混乱がおさまった」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"confusion"`を追加。`confusedTurnsRemaining`(0以上の整数)の検証、`player-confused`/`confusion-faded`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を15に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`confusedTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、混乱の薬を飲んだ状態で複数ターン`move`を実行し、少なくとも1回は指定方向と異なる方向に移動する(または壁にぶつかってターンを消費する)ことを確認し、`confusedTurnsRemaining`が0まで減った時点で`confusion-faded`が記録されることを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、seed 1で混乱状態(残り3ターン)から東への`move`を3回実行し、少なくとも1回は意図しない北へ移動すること、3ターン後に`confusedTurnsRemaining`が0になり`confusion-faded`イベントが記録されることを確認。

**マイルストーン40完了(2026-07-15)。**

## マイルストーン41 — 鈍足の杖(2種類目の杖・初の敵側一時状態)

命中の杖(マイルストーン39)に続く2種類目の杖。狙い先ロジック(視界内最近接の敵を自動選択)は`findNearestVisibleEnemy`をそのまま再利用し、ダメージの代わりに対象の敵を一定ターン完全に凍結させる——原作の"wand of slow monster"を「行動速度半減」ではなく「Nターン完全に行動不能」に簡略化した実装(スケジューラを持たないこの実装では速度の概念自体がプレーンデータの行動回数(`ENEMY_ACTIONS_PER_TURN`)でしかなく、個体ごとの速度を一時的に書き換える仕組みがないため)。指輪(再生・満腹)と同じ「2種類目は同じ絵文字を共有し、効果は使うまで名前からは分からない」という型を杖カテゴリにも適用する。プレイヤー側の一時状態(混乱、マイルストーン40)に続き、初めて敵側にも一時状態(`Enemy.slowedTurnsRemaining`)を持たせる。

- [x] `src/game/events.ts`: `ItemKind`に`"slow"`を追加。`GameEvent`に`enemy-slowed`(payload: `target: EnemyKind`・継続ターン数`turns`)を追加
- [x] `src/game/state.ts`: `Enemy`に`slowedTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `SLOW_WAND_DURATION = 5`・`SLOW_WAND_SPAWN_CHANCE_PERCENT = 15`(命中の杖と同じレア度の独立per-floor判定)を追加
- [x] `src/game/floor.ts`: 敵生成時に全種`slowedTurnsRemaining: 0`で初期化。スポーンプールから低確率で鈍足の杖を1個抽選 + テスト
- [x] `src/game/enemies.ts`: `advanceEnemies`で「眠っていない」判定の直後、`slowedTurnsRemaining > 0`なら1減らすだけでこのターンの行動(移動・攻撃)を一切スキップする分岐を追加(`!awake`の分岐と対称の構造) + テスト(凍結中は動かない・攻撃しない、カウントダウン、0に達すると通常行動に復帰することを含む)
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`slow`分岐——`findNearestVisibleEnemy`(命中の杖と共用)で対象を選び、視界内に敵がいなければ`state`をそのまま返す(命中の杖と同じ無効果パターン)。対象が見つかれば`slowedTurnsRemaining`を`SLOW_WAND_DURATION`にセットし`enemy-slowed`を記録 + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`slow: 🔮`(命中の杖と同一の絵文字——指輪2種と同じ「杖という括りまでしか地面の見た目では分からない」扱い)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`slow: "杖"`(命中の杖も汎用名"杖"に統一し、指輪と同じ「効果は使うまで名前からも分からない」型に揃える——既存の`wand: "命中の杖"`は`"杖"`へ改称)、`enemy-slowed`の文言(「杖の力で◯の動きを封じた!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"slow"`を追加。`enemies`の各要素に`slowedTurnsRemaining`(0以上の整数)の検証を追加。`enemy-slowed`イベントの検証ケースを追加。`Enemy`の構造変更のため**`SAVE_FORMAT_VERSION`を16に** + テスト
- [x] `src/game/save.test.ts`: shape guardの`enemies`要素に`slowedTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、視界内・隣接の敵に鈍足の杖を使い、以後数ターンその敵が完全に動かない(位置・HPとも不変)こと、`SLOW_WAND_DURATION`経過後は通常どおり動き出すことを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、隣接するゾンビに鈍足の杖を使い、以後の凍結ターン中は`playerHp`が一切減らないこと(=凍結中は攻撃してこない)、凍結が明けた直後の`wait`ではゾンビが通常どおり攻撃してくることを確認。

**マイルストーン41完了(2026-07-15)。**

## マイルストーン42 — 浮遊の薬(わなを無効化する一時状態)

原作Rogueの"potion of levitation"を導入する。未鑑定ポーションの5種類目(混乱の薬に続く2つ目の一時状態系ポーション)。効果は単純明快——一定ターンの間、わな(ダーツ・落とし穴)の発動そのものを無効化する。`applyTrapTrigger`は既にダメージ系・強制降下系の両方を1つの関数で扱っているため、「発動前に早期returnする1行」を足すだけで両方に自動的に効く。混乱(マイルストーン40)で確立した`applyXxxTick`+専用ファイルの型をそのまま踏襲する。

- [x] `src/game/events.ts`: `ItemKind`に`"levitation"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-levitated`(payload: 継続ターン数`turns`)・`levitation-faded`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`levitationTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `LEVITATION_POTION_DURATION = 15`・`LEVITATION_POTION_SPAWN_CHANCE_PERCENT = 25`(他の未鑑定ポーションと同じ独立per-floor判定)を追加
- [x] `src/game/levitation.ts`(新規、`confusion.ts`と対になるファイル): `applyLevitationTick(state)` — `levitationTurnsRemaining`を1減らし(下限0)、1→0に落ちた瞬間だけ`levitation-faded`を記録する純粋関数(rng不使用) + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で浮遊の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/advanceTurn.ts`: `applyTrapTrigger`の先頭で`state.levitationTurnsRemaining > 0`なら`state`をそのまま返す(わなは発動せず、消費もされない——浮いて素通りする)。`applyUseItem`に`levitation`分岐(`levitationTurnsRemaining`を`LEVITATION_POTION_DURATION`にセットし`player-levitated`を記録)を追加。move/wait/use-itemの3箇所すべてで`applyLevitationTick`を(`applyConfusionTick`等と並べて)呼ぶ + テスト(わな無効化・落とし穴による強制降下も無効化されること・鑑定・継続ターン数の減衰を含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`levitation: 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/main.tsx`: ステータスバーに浮遊中であることを示す表示を追加(混乱中と同様の1項目)
- [x] `src/messages.ts`: `ITEM_NAMES`に`levitation: "浮遊の薬"`、`player-levitated`(「◯を飲んだ。体がふわりと浮いた!」)・`levitation-faded`(「浮遊の効果が切れた」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"levitation"`を追加。`levitationTurnsRemaining`(0以上の整数)の検証、`player-levitated`/`levitation-faded`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を17に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`levitationTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、わな(ダーツ・落とし穴それぞれ)の上に浮遊状態で乗せても`playerHp`・`floor`が変化しない(わなが消費されずそのまま残る)ことを確認し、浮遊が切れた後は通常どおりわなが発動することを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、浮遊中はダーツトラップでダメージを受けず(わなも消費されず残存)、落とし穴でも強制降下しないこと、浮遊が切れた後は同じダーツトラップが通常どおり発動することを確認。

**マイルストーン42完了(2026-07-15)。**

## マイルストーン43 — 防具保護の巻物(アクエーターの錆び対策)

原作Rogueの"scroll of protect armor"を導入する。アクエーター(マイルストーン38)が持ち込んだ「防御力がじわじわ錆びる」という圧力に対する、初めての直接的な対抗策。原作は特定の防具1着を恒久的に錆び付かなくするが、本実装には個体別の防具という概念がないため、`GameState.armorProtected`という恒久フラグに簡略化する——一度読めば、以後アクエーターの錆び判定そのものが二度と発生しない。他の巻物(武器/防具強化)と同じく無条件・rng不使用で確定効果。

- [x] `src/game/events.ts`: `ItemKind`に`"protect-armor"`を追加。`GameEvent`に`armor-protected`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`armorProtected: boolean`(構造変更)を追加
- [x] `src/game/balance.ts`: `PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 20`(他の巻物と同じ独立per-floor判定)を追加
- [x] `src/game/floor.ts`: スポーンプールから低確率で防具保護の巻物を1個抽選 + テスト
- [x] `src/game/enemies.ts`: `advanceEnemies`のアクエーター錆び判定の先頭に`state.armorProtected`なら判定自体をスキップする早期returnを追加(rngも消費しない——判定する必要すらないため) + テスト
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`protect-armor`分岐(`armorProtected`を`true`にし`armor-protected`を記録。指輪と同じく既に保護済みでも消費されるだけで効果に変化はない) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`"protect-armor": 🔰`(単一コードポイント、Unicode 6.0)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`"protect-armor": "防具保護の巻物"`、`armor-protected`の文言(「防具保護の巻物を読んだ。防具が錆びなくなった!」) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"protect-armor"`を追加。`armorProtected`(真偽値)の検証、`armor-protected`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を18に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`armorProtected: "boolean"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、防具保護の巻物を読んだ状態でアクエーターに複数ターン隣接させ続け、`playerDefense`が一切下がらない(`armor-rusted`イベントが一度も発生しない)ことを確認する

自動テスト(型検査・lint・Vitest・knip・build)は通過済み。パイプライン確認(`npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで実施)でも、防具保護の巻物を読んだ後にアクエーターへ隣接した状態で`wait`を10ターン実行し、`playerDefense`が一切下がらず`armor-rusted`イベントも一度も発生しないことを確認。

**マイルストーン43完了(2026-07-15)。**

## マイルストーン44 — 盲目の薬(視界半径を操作する初のポーション)

これまでの一時状態(混乱・浮遊)はどちらも既存の仕組みへの副作用(移動方向の上書き・わな判定のスキップ)として実装できたが、盲目の薬は初めて**視界そのもの(`computeVisiblePoints`のFOV半径)を状態依存にする**。`src/game/vision.ts`の`VIEW_RADIUS`はこれまでモジュール内定数だったが、`resolveViewRadius(state)`という新しい導出関数を挟み、`state.blindTurnsRemaining > 0`なら`BLIND_VIEW_RADIUS`(隣接のみ)を返すようにする。呼び出し側で「今の状態でのプレイヤー視界」を求めている箇所(描画・探索済みグリッドの拡張・敵のAI視認判定・杖の自動照準)はすべてこの関数を経由するよう置き換える——フロア生成時のアイテム/敵配置(`floor.ts`)はプレイヤーの一時状態と無関係なので対象外。盲目の間は新しいマス目を探索済みにもできない(見えないのだから当然)ため、`deriveExploredState`も連動して縮む。

- [x] `src/game/events.ts`: `ItemKind`に`"blindness"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-blinded`(payload: 継続ターン数`turns`)・`blindness-faded`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`blindTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `BLIND_POTION_DURATION = 20`・`BLIND_POTION_SPAWN_CHANCE_PERCENT = 25`(他の未鑑定ポーションと同じ独立per-floor判定)・`BLIND_VIEW_RADIUS = 1`(隣接マスのみ)を追加
- [x] `src/game/vision.ts`: `computeVisiblePoints`に`radius`引数(デフォルト`VIEW_RADIUS`)を追加。新規`resolveViewRadius(state): number`(`blindTurnsRemaining > 0 ? BLIND_VIEW_RADIUS : VIEW_RADIUS`)をexportし、`deriveExploredState`内部の呼び出しをこれ経由に変更 + テスト
- [x] `src/game/blindness.ts`(新規、`confusion.ts`/`levitation.ts`と対になるファイル): `applyBlindnessTick(state)` — `blindTurnsRemaining`を1減らし(下限0)、1→0に落ちた瞬間だけ`blindness-faded`を記録する純粋関数(rng不使用) + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で盲目の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/frame.ts`・`src/game/enemies.ts`・`src/game/advanceTurn.ts`(杖の自動照準`findNearestVisibleEnemy`): 各所の`computeVisiblePoints(state.terrain, state.player)`呼び出しを`computeVisiblePoints(state.terrain, state.player, resolveViewRadius(state))`に置き換え
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`blindness`分岐(`blindTurnsRemaining`を`BLIND_POTION_DURATION`にセットし`player-blinded`を記録)を追加。move/wait/use-itemの3箇所すべてで`applyBlindnessTick`を(他のtickと並べて)呼ぶ + テスト(視界半径が実際に縮むこと・探索済みグリッドが盲目中は拡張されないこと・杖が隣接以外を自動照準しなくなることを含む)
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`blindness: 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/main.tsx`: ステータスバーに盲目中であることを示す表示を追加(混乱中・浮遊中と同様の1項目)
- [x] `src/messages.ts`: `ITEM_NAMES`に`blindness: "盲目の薬"`、`player-blinded`(「◯を飲んだ。目の前が真っ暗になった!」)・`blindness-faded`(「目が見えるようになった」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"blindness"`を追加。`blindTurnsRemaining`(0以上の整数)の検証、`player-blinded`/`blindness-faded`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を19に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`blindTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、盲目の薬を飲んだ状態と飲んでいない状態それぞれで`buildFrameGrid`の可視マス数を比較し、盲目中は視界が大幅に縮んでいることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`resolveViewRadius(state)`を`vision.ts`に導入し、`computeVisiblePoints`に`radius`引数を追加。盲目中(`blindTurnsRemaining > 0`)は`BLIND_VIEW_RADIUS`(隣接マスのみ)を返し、描画(`frame.ts`)・敵AIの視認判定(`enemies.ts`)・杖の自動照準(`advanceTurn.ts`の`findNearestVisibleEnemy`)・探索済みグリッドの拡張(`deriveExploredState`)の4箇所すべてがこの関数経由になった(フロア生成時のスポーン配置は対象外のまま)。盲目の薬(`blindness`)は他の未鑑定ポーションと同じ`identifiedPotionKinds`の型に乗り、`blindness.ts`の`applyBlindnessTick`が混乱・浮遊と同型の純粋カウントダウン関数として追加された。パイプライン確認スクリプトでは、盲目状態で1マス移動した際の新規探索マス数(9)が通常状態(225)より大幅に少ないことを実際に`dist/game/index.mjs`越しに確認した。テストは722件(前回706件から+16)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン44完了(2026-07-15)。**

## マイルストーン45 — 経験値とレベルアップ(原作Rogueの基礎システムの再現)

これまでの44マイルストーンで敵・アイテム・わな・一時状態異常など多くの要素を再現してきたが、原作Rogueの根幹システムの一つである**経験値によるレベルアップ**がまだ存在しない——`playerHp`の上限は`PLAYER_MAX_HP`というモジュール内定数のまま、敵を倒しても数値的な見返りは一切ない。本マイルストーンでは`GameState`に`playerLevel`・`playerExperience`・`playerMaxHp`(構造変更)を追加し、敵を倒す(`enemy-defeated`)たびに種別ごとの固定経験値を獲得、累積が閾値を超えるとレベルが上がって最大HPが恒久的に増える(現在HPも同量回復)という原作の骨格をシンプルな形で再現する。装備や乱数要素は絡めず、決定的な固定値のみで完結させる——`combat.ts`の「ダメージは固定値、乱数なし」という既存方針(マイルストーン15)と同じ考え方。

- [x] `src/game/events.ts`: `GameEvent`に`player-leveled-up`(payload: 到達レベル`level`)を追加
- [x] `src/game/state.ts`: `GameState`に`playerLevel: number`・`playerExperience: number`・`playerMaxHp: number`(すべて構造変更)を追加。`playerHp`の意味は変わらない(現在値)が、上限は今後`state.playerMaxHp`を参照する
- [x] `src/game/balance.ts`: `PLAYER_LEVEL_UP_HP_BONUS = 3`(レベルアップ1回あたりの最大HP増加量)・`LEVEL_EXPERIENCE_THRESHOLDS`(レベル2〜10到達に必要な累積経験値の配列、原作同様おおよそ倍々で増加させる)・`ENEMY_EXPERIENCE_REWARD`(`ENEMY_MAX_HP`と同じ idiom の`EnemyKind`別ルックアップ表、HPが高い敵ほど多め)を追加
- [x] `src/game/experience.ts`(新規): `applyExperienceGain(state, amount): GameState` — `playerExperience`に加算し、`LEVEL_EXPERIENCE_THRESHOLDS`を超えるたびに`playerLevel`を1つずつ上げ`playerMaxHp`/`playerHp`を`PLAYER_LEVEL_UP_HP_BONUS`だけ増やし`player-leveled-up`を記録する純粋関数(乱数不使用、複数レベル同時到達にも対応するループ) + テスト
- [x] `src/game/combat.ts`: `applyPlayerAttack`・`applyWandStrike`の両方で、撃破(`remainingHp <= 0`)時に`applyExperienceGain(nextState, ENEMY_EXPERIENCE_REWARD[target.kind])`を経由してから返すよう変更 + テスト
- [x] `PLAYER_MAX_HP`(モジュール内定数)への依存を`state.playerMaxHp`に置き換える箇所: `src/game/regeneration.ts`(上限判定)・`src/game/advanceTurn.ts`(回復薬の回復量クランプ)・`src/game/validateGameState.ts`(`playerHp`の上限検証を`playerMaxHp`との比較に変更しつつ`playerMaxHp`自体の検証も追加)・`src/main.tsx`(ステータスバーのHP表示)
- [x] `src/game/initialState.ts`: `buildArenaGameState`・`buildDungeonGameState`の両方に`playerLevel: 1`・`playerExperience: 0`・`playerMaxHp: PLAYER_MAX_HP`(初期値)を追加
- [x] `src/main.tsx`: ステータスバーにレベル表示を追加(例: `Lv.1`)
- [x] `src/messages.ts`: `player-leveled-up`の文言(例:「レベルが上がった!(Lv.◯)」) + テスト
- [x] `src/game/validateGameState.ts`: `playerLevel`(1以上の整数)・`playerExperience`(0以上の整数)・`playerMaxHp`(正の整数、`playerHp`以上)の検証、`player-leveled-up`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を20に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`playerLevel`・`playerExperience`・`playerMaxHp`(いずれも`"number"`)を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、敵を複数体倒して経験値が累積しレベルアップ時に`playerMaxHp`/`playerHp`が実際に増えることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`GameState`に`playerLevel`/`playerExperience`/`playerMaxHp`を追加し、`src/game/experience.ts`の`applyExperienceGain`が閾値超過を1レベルずつ処理する(1回の大きな経験値獲得で複数レベル同時到達にも対応)純粋関数として実装された。`combat.ts`の`applyPlayerAttack`/`applyWandStrike`はどちらも撃破時に`ENEMY_EXPERIENCE_REWARD[target.kind]`を渡して`applyExperienceGain`を経由するようになり、`playerHp`の上限としてモジュール内定数`PLAYER_MAX_HP`を直接参照していた4箇所(`regeneration.ts`・`advanceTurn.ts`の回復薬クランプ・`validateGameState.ts`・`main.tsx`)はすべて`state.playerMaxHp`経由に置き換わった(`PLAYER_MAX_HP`は初期値としてのみ`initialState.ts`から参照される)。パイプライン確認では、アリーナで隣接ゾンビを連続撃破し経験値蓄積→レベルアップ→`playerMaxHp`/`playerHp`の実際の増加→`player-leveled-up`イベント発火までを`dist/game/index.mjs`越しに確認した。テストは731件(前回722件から+9)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン45完了(2026-07-15)。**

## マイルストーン46 — 麻痺の薬(初めて行動そのものを封じる一時状態)

原作Rogueのポーションのうち、混乱・浮遊・盲目(これまで実装済み)と並ぶ危険な一種が**麻痺**——効いている間はプレイヤーが一切の行動を取れず(移動もアイテム使用も不可)、それでもターンは経過して敵は行動し続ける。これまでの一時状態(混乱=移動方向の上書き、浮遊=わな無効化、盲目=視界半径縮小)はどれも「行動はできるが結果が変わる」タイプだったのに対し、麻痺は初めて「行動そのものを無効化する」タイプになる。`advanceTurn`の`move`/`use-item`ケースの先頭で`state.paralyzedTurnsRemaining > 0`を検知したら、実際の移動・アイテム使用ロジックを一切実行せず`wait`と同じ「敵だけが行動する」経路に落とす。また、5つ目のターン終端tick(空腹・再生・混乱・浮遊・盲目)が並ぶ`applyBlindnessTick(applyLevitationTick(applyConfusionTick(applyRegenerationTick(applyHungerTick(...)))))`という5重ネストが`move`の2箇所・`wait`・`use-item`の計4箇所に重複していたので、本マイルストーンで`applyTurnEndTicks(state)`という1つの純粋関数に括り出し、麻痺tickを含めた6重ネストの重複をこれ以上増やさないようにする。

- [x] `src/game/events.ts`: `ItemKind`に`"paralysis"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-paralyzed`(payload: 継続ターン数`turns`)・`paralysis-faded`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`paralyzedTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `PARALYSIS_POTION_DURATION = 3`(他の一時状態より短いが行動皆無という重さで釣り合わせる)・`PARALYSIS_POTION_SPAWN_CHANCE_PERCENT = 25`を追加
- [x] `src/game/paralysis.ts`(新規、`confusion.ts`/`levitation.ts`/`blindness.ts`と対になるファイル): `applyParalysisTick(state)` — `paralyzedTurnsRemaining`を1減らし(下限0)、1→0に落ちた瞬間だけ`paralysis-faded`を記録する純粋関数(rng不使用) + テスト
- [x] `src/game/advanceTurn.ts`: `applyTurnEndTicks(state): GameState`(空腹→再生→混乱→浮遊→盲目→麻痺の6tickをまとめる純粋関数)を新設し、`move`(2箇所)・`wait`・`use-item`の計4箇所の重複したネストをこれ呼び出しに置き換える。`move`・`use-item`の先頭に`state.paralyzedTurnsRemaining > 0`の分岐を追加し、麻痺中は実際の移動/アイテム使用ロジックを飛ばして`applyTurnEndTicks(advanceEnemies(state))`(=waitと同じ経路)を返す。`applyUseItem`に`paralysis`分岐(`paralyzedTurnsRemaining`を`PARALYSIS_POTION_DURATION`にセットし`player-paralyzed`を記録)を追加 + テスト(麻痺中に移動しようとしても位置が変わらないこと・アイテムを使おうとしても持ち物が減らないこと・それでも敵は行動しターンが経過することを含む)
- [x] `src/game/floor.ts`: スポーンプールから低確率で麻痺の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`paralysis: 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/main.tsx`: ステータスバーに麻痺中であることを示す表示を追加(混乱中・浮遊中・盲目と同様の1項目)
- [x] `src/messages.ts`: `ITEM_NAMES`に`paralysis: "麻痺の薬"`、`player-paralyzed`(「◯を飲んだ。体が動かなくなった!」)・`paralysis-faded`(「体が動くようになった」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"paralysis"`を追加。`paralyzedTurnsRemaining`(0以上の整数)の検証、`player-paralyzed`/`paralysis-faded`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を21に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`paralyzedTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、麻痺中に移動アクションを送っても実際には位置が変わらずターンだけ経過することを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`advanceTurn`の`move`/`use-item`ケースの先頭に`state.paralyzedTurnsRemaining > 0`の分岐を追加し、麻痺中は実際の移動・アイテム使用ロジックを一切実行せず`applyTurnEndTicks(advanceEnemies(state))`(waitと同じ経路)に落とすことで、混乱・浮遊・盲目とは異なる「行動そのものを無効化する」一時状態を実現した。あわせて、5〜6重にネストされたターン終端tickの呼び出しが`move`(2箇所)・`wait`・`use-item`の計4箇所に重複していたのを`applyTurnEndTicks(state)`という1つの純粋関数に統合し、今後tickが増えてもこの重複が増えないようにした。パイプライン確認では、麻痺中に移動アクションを送ってもプレイヤー座標が変わらず、それでも空腹度が減りターンが経過し、隣接する敵が実際に攻撃してくることを`dist/game/index.mjs`越しに確認した。テストは745件(前回731件から+14)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン46完了(2026-07-15)。**

## マイルストーン47 — テレポートの罠(3種類目のわな、テレポート巻物のロジックを再利用)

原作Rogueのわなにはこれまで実装済みの矢(ダメージ)・落とし穴(強制降下)に加えて、テレポートの罠がある——踏むとダメージなしでフロア内のランダムな地点へ瞬間移動させられる。都合の良いことに、この移動先選定ロジック(自分の座標・敵がいる座標を除いた床タイルから乱数で1つ選ぶ)は`advanceTurn.ts`の`collectTeleportTargets`としてテレポートの巻物(マイルストーン相当、`kind === "scroll"`分岐)がすでに実装済みなので、わな版は「乱数消費して移動先を選び`deriveExploredState`で視界を更新する」という同じロジックを`applyTrapTrigger`から再利用するだけで済む。落とし穴と同様、GOAL_FLOOR上でも問題なく機能する(同一フロア内の移動でしかないため、落とし穴のような「その先のフロアを生成してしまう」問題が起きない)。

- [x] `src/game/events.ts`: `TrapKind`に`"teleport"`を追加。`player-teleported`イベントは巻物用に既存のものをそのまま再利用(新規イベント型は不要)
- [x] `src/game/balance.ts`: `TRAP_DAMAGE`に`teleport: 0`(ダメージなし、落とし穴と同じ0ダメージ扱い)を追加。`TELEPORT_TRAP_SPAWN_CHANCE_PERCENT = 20`(落とし穴の`TRAPDOOR_SPAWN_CHANCE_PERCENT`と同じidiom、ただしGOAL_FLOOR除外はしない)を追加
- [x] `src/game/advanceTurn.ts`: `collectTeleportTargets`を`applyTrapTrigger`より前方に定義し直す(現状は巻物分岐でしか使われておらず`applyTrapTrigger`より後ろにある)。`applyTrapTrigger`内で`trap.kind === "teleport"`かつ生存時に、テレポート巻物と同じ「乱数で移動先を選び`player-teleported`を記録し`deriveExploredState`で視界を更新する」ロジックを適用する新規ヘルパー`applyTrapTeleport(state)`を追加して呼び出す + テスト
- [x] `src/game/floor.ts`: `TRAPDOOR_SPAWN_CHANCE_PERCENT`と同じ独立per-floor判定でテレポートの罠を1個抽選してスポーンプールに追加(GOAL_FLOOR除外なし) + テスト
- [x] `src/messages.ts`: `TRAP_NAMES`に`teleport: "テレポートの罠"`を追加 + テスト
- [x] `src/game/validateGameState.ts`: `isTrapKind`に`"teleport"`を追加。`trap-triggered`イベントの0ダメージ許容分岐(現状`trapdoor`のみ)に`teleport`も加える + テスト
- [x] `src/game/save.test.ts`: 構造変更なし(既存の`traps`配列の`kind: "string"`がそのまま`"teleport"`もカバーするため、shape guard自体の追記は不要 — 念のため確認のみ)
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、テレポートの罠を踏むとダメージを受けずにプレイヤー座標が変わり`player-teleported`イベントが記録されることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`collectTeleportTargets`を`applyTrapTrigger`より前方に移動し、新設した`applyTrapTeleport(state)`ヘルパーに「乱数で移動先を選び`player-teleported`を記録し視界を更新する」ロジックを1本化。テレポート巻物側(`kind === "scroll"`分岐)もこのヘルパーを`{ ...applyTrapTeleport(state), inventory }`という形で呼び直すように書き換え、重複していたテレポート先選定ロジックを完全に統合した。テレポートの罠はGOAL_FLOORでも通常通りスポーンする(落とし穴と異なり、同一フロア内の移動でしかないため)。パイプライン確認では、テレポートの罠を踏むとダメージゼロ・トラップ消費・プレイヤー座標の変化・`trap-triggered`+`player-teleported`イベントの発火を`dist/game/index.mjs`越しに確認した。テストは750件(前回745件から+5)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン47完了(2026-07-15)。**

## マイルストーン48 — 上級の薬(レベルアップの薬、経験値システムを迂回する即時レベルアップ)

マイルストーン45で経験値によるレベルアップを実装したが、原作Rogueにはもう一つ、敵を倒さずとも即座にレベルを1つ上げる**Potion of Raise Level**が存在する。この薬は「累積経験値が閾値を超える」という通常の成長ルートを迂回する特別な効果なので、`applyExperienceGain`(閾値判定・レベル上限10のキャップつき)とは別に、`experience.ts`へ`applyLevelUp(state)`という「`playerExperience`に一切触れず、`playerLevel`を無条件に+1し`playerMaxHp`/`playerHp`を恒久的に増やす」独立した純粋関数を新設する。無条件(上限なし)にする理由は、原作でもこの薬が終盤の伸びしろとして機能するため——`LEVEL_EXPERIENCE_THRESHOLDS`のレベル10キャップは「通常の狩りによる成長」だけに適用され、この薬による成長はそれを迂回してよい。`GameState`への新規フィールドは不要(既存の`playerLevel`/`playerMaxHp`/`playerHp`を直接書き換えるだけ)なので、構造変更なし・`SAVE_FORMAT_VERSION`据え置きで完結する初めての「未鑑定ポーション追加」マイルストーンになる。

- [x] `src/game/events.ts`: `ItemKind`に`"raise-level"`を追加し`POTION_KINDS`に加える(新規`GameEvent`は不要 — 既存の`player-leveled-up`をそのまま再利用)
- [x] `src/game/experience.ts`: `applyLevelUp(state): GameState`(`playerLevel`を無条件に+1、`playerMaxHp`/`playerHp`を`PLAYER_LEVEL_UP_HP_BONUS`だけ増やし`player-leveled-up`を記録する純粋関数、レベル上限なし・rng不使用) + テスト
- [x] `src/game/balance.ts`: `RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT = 15`(他の未鑑定ポーションよりやや低め — 即時レベルアップは原作でも希少)を追加
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`raise-level`分岐(`applyLevelUp(state)`を呼び、`inventory`/`identifiedPotionKinds`を反映して返す)を追加 + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で上級の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`"raise-level": 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`"raise-level": "レベルアップの薬"`を追加(飲んだ時のイベント文言は既存の`player-leveled-up`のものがそのまま出る) + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"raise-level"`を追加(新規フィールド・イベント検証は不要) + テスト
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、上級の薬を飲むと敵を倒さずに`playerLevel`が上がり`playerMaxHp`/`playerHp`が実際に増えることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`experience.ts`に`applyLevelUp(state)`を追加し、`applyExperienceGain`の閾値・レベル10キャップとは独立した「無条件+1レベル」経路を実現した。`GameState`への新規フィールドが不要だったため、このマイルストーンは初めて構造変更なし・`SAVE_FORMAT_VERSION`据え置きで完結した未鑑定ポーション追加になった。パイプライン確認では、上級の薬を飲むと敵を倒さずに`playerLevel`が1上がり`playerMaxHp`/`playerHp`が実際に増え、`playerExperience`は変化しないことを`dist/game/index.mjs`越しに確認した。テストは756件(前回750件から+6)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン48完了(2026-07-15)。**

## マイルストーン49 — 最終スコア表示(原作Rogueの締めくくりのスコア画面)

原作Rogueはプレイヤーが死亡または(アミュレットを持ち帰って)クリアすると、所持金・到達階層・レベル・死因をもとにしたスコアを表示して終了する。現状の`main.tsx`は`state.status`が`"playing"`でなくなると`formatEvent`によるログの最終行(「たおされた」「アミュレットを手に入れて帰還した」等)だけを画面に残したまま`exit()`しており、スコアという総括的な締めの表示がない。この機能はプレイヤーがすでに持っている`GameState`のフィールド(`goldCollected`・`floor`・`playerLevel`・`hasAmulet`)だけから導出できるので、`GameState`に新規フィールドは不要——`src/game/score.ts`に`calculateScore(state): number`という純粋関数(`derive*`命名規則どおり、乱数・I/O不使用)を追加し、`main.tsx`が run 終了時にそれを呼んで1行のスコアサマリーを表示するだけで完結する。

- [x] `src/game/score.ts`(新規): `calculateScore(state: GameState): number` — `goldCollected + floor * SCORE_PER_FLOOR + playerLevel * SCORE_PER_LEVEL + (hasAmulet ? SCORE_AMULET_BONUS : 0)`という単純な決定的合算。`src/game/balance.ts`に`SCORE_PER_FLOOR = 100`・`SCORE_PER_LEVEL = 50`・`SCORE_AMULET_BONUS = 500`を追加 + テスト
- [x] `src/game/index.ts`: `calculateScore`を再エクスポート(shellが使うための公開API、他のderive系関数と同じ扱い)
- [x] `src/main.tsx`: `state.status`が`"dead"`または`"won"`になった最終フレームで、ログの下に「スコア: ◯(Lv.◯, B◯F, 所持金◯, 護符あり/なし)」という1行のサマリーをステータスバーと同じ`<Box>`パターンで表示する。`exit()`を呼ぶ`useEffect`の直前にこの表示があるため、Inkのレンダーサイクル上この最終フレームは画面に残ったままプロセスが終了する(既存の死亡/勝利ログ行と同じ仕組み)
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、所持金・到達階層・レベル・アミュレット所持を組み合わせた複数パターンの`GameState`に対し`calculateScore`が期待通りの値を返すことを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`GameState`への新規フィールド追加なし・`SAVE_FORMAT_VERSION`据え置きで完結した(既存フィールドからの純粋な導出のみ)。`messages.ts`に`formatScoreSummary`を追加し、スコア文言の組み立ても他の`formatEvent`/`formatInventoryEntry`と同じくshell側の1箇所に集約した。`main.tsx`では`state.status`が`"dead"`/`"won"`になった最終フレームでログの下にスコア行を1行追加しただけで、既存の「最終フレームが画面に残ったままexitする」という仕組みをそのまま利用した。パイプライン確認では、所持金・到達階層・レベル・アミュレット所持を組み合わせた複数パターンで`calculateScore`が期待通り増減することを`dist/game/index.mjs`越しに確認した。テストは760件(前回756件から+4)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン49完了(2026-07-15)。**

## マイルストーン50 — 索敵の薬(FOVを迂回して敵の位置を一時的に可視化)

原作Rogueのpotion of monster detectionは、マップ全体の敵の位置を一時的に見えるようにする——地形は見えないままだが、敵だけはFOVの外や未探索領域にいても表示される。これまでの一時状態(混乱・浮遊・盲目・麻痺)は視界やプレイヤーの行動そのものに作用するものだったが、この薬は初めて「敵の描画条件」に作用する。`frame.ts`の`buildFrameGrid`は現在「`visiblePoints`に含まれる敵だけ描画する」という1行の条件分岐で敵の可視性を決めており(`if (!visiblePoints.has(...)) continue;`)、この条件に`state.detectMonstersTurnsRemaining > 0`を`||`で足すだけで実現できる。マイルストーン46で新設した`applyTurnEndTicks`にもう1つtickを足すだけで済むため、実装コストは既存の一時状態群の中でも最小の部類になる。

- [x] `src/game/events.ts`: `ItemKind`に`"detect-monster"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-detected-monsters`(payload: 継続ターン数`turns`)・`detect-monsters-faded`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`detectMonstersTurnsRemaining: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `DETECT_MONSTER_POTION_DURATION = 20`・`DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT = 25`を追加
- [x] `src/game/detectMonsters.ts`(新規、`confusion.ts`/`levitation.ts`/`blindness.ts`/`paralysis.ts`と対になるファイル): `applyDetectMonstersTick(state)` — `detectMonstersTurnsRemaining`を1減らし(下限0)、1→0に落ちた瞬間だけ`detect-monsters-faded`を記録する純粋関数(rng不使用) + テスト
- [x] `src/game/advanceTurn.ts`: `applyTurnEndTicks`に`applyDetectMonstersTick`を追加(既存の呼び出し4箇所すべてに自動的に効く)。`applyUseItem`に`detect-monster`分岐(`detectMonstersTurnsRemaining`を`DETECT_MONSTER_POTION_DURATION`にセットし`player-detected-monsters`を記録)を追加 + テスト
- [x] `src/game/frame.ts`: 敵描画の可視性条件を`visiblePoints.has(encodePointKey(enemy.x, enemy.y)) || state.detectMonstersTurnsRemaining > 0`に変更(地形やアイテムの可視性条件はそのまま — 索敵の薬は敵の位置だけを暴く) + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で索敵の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`"detect-monster": 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/main.tsx`: ステータスバーに索敵中であることを示す表示を追加(混乱中・浮遊中・盲目・麻痺と同様の1項目)
- [x] `src/messages.ts`: `ITEM_NAMES`に`"detect-monster": "索敵の薬"`、`player-detected-monsters`(「◯を飲んだ。敵の気配を感じ取れるようになった!」)・`detect-monsters-faded`(「敵の気配を感じられなくなった」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"detect-monster"`を追加。`detectMonstersTurnsRemaining`(0以上の整数)の検証、`player-detected-monsters`/`detect-monsters-faded`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を22に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`detectMonstersTurnsRemaining: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、索敵の薬を飲むと視界外・未探索領域の敵が`buildFrameGrid`の出力に現れることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`applyTurnEndTicks`にtickを1つ足すだけで済んだため、実装コストは想定通り一時状態群の中でも最小だった。`frame.ts`の敵描画条件に`state.detectMonstersTurnsRemaining > 0`を`||`で足す1行だけで、視界外・未探索領域の敵も描画されることを確認(地形・アイテム・金貨の可視性条件は変更なし——索敵の薬は敵の位置だけを暴く)。パイプライン確認では、通常FOV外(距離12)の敵が索敵の薬なしでは非表示、索敵中は表示されることを`dist/game/index.mjs`越しに確認した。テストは772件(前回760件から+12)すべて通過、型検査・lint・knip・buildも全てクリーン。
**マイルストーン50完了(2026-07-15)。**

## マイルストーン51 — 生命の薬(アイデアメモ発の初採用、Brogueのpotion of life)

`docs/idea-memo.md`で有力候補とした「Brogueのpotion of life」(全回復+最大HPの恒久増加)を採用する。この薬の型は既存の武器強化/防具強化の巻物(呪いなしで恒久的にステータスを上げる消費アイテム)と全く同じで、対象が`playerAttackDamage`/`playerDefense`ではなく`playerMaxHp`になるだけ——`GameState`への新規フィールドは不要(既存の`playerMaxHp`/`playerHp`を直接書き換えるだけ)。マイルストーン48の「上級の薬」に続き、構造変更なしで完結する2件目のポーション追加になる。回復量が「最大HP上昇分」に依存するため既存の`player-healed`イベントを流用せず、専用の`player-revitalized`イベントで「最大HPが上がった」ことを明示する。

- [x] `src/game/events.ts`: `ItemKind`に`"life"`を追加し`POTION_KINDS`に加える。`GameEvent`に`player-revitalized`(payload: 最大HP上昇量`maxHpBonus`)を追加
- [x] `src/game/balance.ts`: `LIFE_POTION_MAX_HP_BONUS = 5`(マイルストーン45の`PLAYER_LEVEL_UP_HP_BONUS`より高め — 原作でも高価値な薬という位置づけ)・`LIFE_POTION_SPAWN_CHANCE_PERCENT = 15`(上級の薬と同じくやや低め)を追加
- [x] `src/game/advanceTurn.ts`: `applyUseItem`に`life`分岐(`playerMaxHp`を`LIFE_POTION_MAX_HP_BONUS`だけ増やし`playerHp`を新しい上限まで全回復、`player-revitalized`を記録)を追加 + テスト
- [x] `src/game/floor.ts`: スポーンプールから低確率で生命の薬を1個抽選(見た目は回復薬と同一) + テスト
- [x] `src/game/frame.ts`: `ITEM_GLYPHS`に`life: 💊`(未鑑定のため回復薬等と同一)を追加
- [x] `src/messages.ts`: `ITEM_NAMES`に`life: "生命の薬"`、`player-revitalized`(「生命の薬を飲んだ。最大HPが◯上がり、体力が全回復した!」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `isItemKind`に`"life"`を追加。`player-revitalized`イベントの検証ケースを追加(新規フィールドなし、`SAVE_FORMAT_VERSION`据え置き) + テスト
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、生命の薬を飲むと`playerMaxHp`が恒久的に増え`playerHp`が新しい上限まで全回復することを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

想定通り`GameState`への新規フィールド追加なし・`SAVE_FORMAT_VERSION`据え置きで完結した(マイルストーン48の上級の薬に続き2件目)。専用の`player-revitalized`イベントにより、生成された`player-healed`のような汎用回復メッセージではなく「最大HPが上がった」ことを明示するメッセージになった。パイプライン確認では、生命の薬を飲むと`playerMaxHp`が恒久的に増え`playerHp`が新しい上限まで全回復することを`dist/game/index.mjs`越しに確認した。テストは776件(前回772件から+4)すべて通過、型検査・lint・knip・buildも全てクリーン。`docs/idea-memo.md`の有力候補からの初採用が完了した。
**マイルストーン51完了(2026-07-15)。**

## マイルストーン52 — クロンの風(1フロアへの粘りを防ぐ強制排出)

`docs/idea-memo.md`で有力候補とした「シレンのクロンの風」(1つのフロアに長時間滞在すると警告の後に強制的に追い出される、粘り防止ギミック)を採用する。純粋に数値カウンタ+閾値超過時の強制効果だけで完結し、`descendStairs`という既存の階層遷移ロジックをそのまま再利用できる——実質的には「規定ターン数が経過したら自動で落とし穴を踏んだのと同じ扱いになる」という設計になる。GOAL_FLOOR(アミュレットのある最深部、上り階段しかない)は対象外とする——強制的な降下はGOAL_FLOORより下のフロアを作ってしまい「GOAL_FLOORから先は上りしかない」という既存の設計前提を壊すため。

- [x] `src/game/events.ts`: `GameEvent`に`winds-of-kron-warning`(payloadなし)・`winds-of-kron-eviction`(payloadなし)を追加
- [x] `src/game/state.ts`: `GameState`に`turnsOnCurrentFloor: number`(構造変更)を追加
- [x] `src/game/balance.ts`: `WINDS_OF_KRON_WARNING_TURNS = 150`(警告が出るターン数)・`WINDS_OF_KRON_EVICTION_TURNS = 200`(強制排出されるターン数)を追加
- [x] `src/game/windsOfKron.ts`(新規): `applyWindsOfKronTick(state)` — `state.floor >= GOAL_FLOOR`なら無条件で無視(GOAL_FLOORより下のフロアを生成しないため)。それ以外は`turnsOnCurrentFloor`を1増やし、`WINDS_OF_KRON_WARNING_TURNS`到達時に`winds-of-kron-warning`を記録、`WINDS_OF_KRON_EVICTION_TURNS`到達時に`winds-of-kron-eviction`を記録してから`descendStairs`(floor.ts)を呼んで強制的に次のフロアへ落とす(`turnsOnCurrentFloor`は`descendStairs`側でのフロア遷移時に0リセットされる) + テスト
- [x] `src/game/floor.ts`: `buildFloorTransition`(descendStairs/ascendStairs共通のヘルパー)が返す状態に`turnsOnCurrentFloor: 0`を追加。`ascendStairs`のフロア1到達による早期return(2箇所、勝利/退出)にも同様に追加 + テスト
- [x] `src/game/advanceTurn.ts`: `applyTurnEndTicks`に`applyWindsOfKronTick`を追加(既存の呼び出し4箇所すべてに自動的に効く)
- [x] `src/game/initialState.ts`: `buildArenaGameState`・`buildDungeonGameState`の両方に`turnsOnCurrentFloor: 0`を追加
- [x] `src/messages.ts`: `winds-of-kron-warning`(「不気味な風を感じる。長居は禁物のようだ…」)・`winds-of-kron-eviction`(「クロンの風に吹き飛ばされた!」)の文言 + テスト
- [x] `src/game/validateGameState.ts`: `turnsOnCurrentFloor`(0以上の整数)の検証、`winds-of-kron-warning`/`winds-of-kron-eviction`イベントの検証ケースを追加。構造変更のため**`SAVE_FORMAT_VERSION`を23に** + テスト
- [x] `src/game/save.test.ts`: shape guardに`turnsOnCurrentFloor: "number"`を追記
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、同じフロアで`WINDS_OF_KRON_EVICTION_TURNS`回以上`wait`し続けると実際にフロアが強制的に切り替わり`winds-of-kron-eviction`イベントが記録されることを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

`applyWindsOfKronTick`は`descendStairs`をそのまま呼ぶだけで完結し、フロア遷移・敵/アイテム再配置・`turnsOnCurrentFloor`のリセットまで既存ロジックに委譲できた。パイプライン確認では、ダミーの`turnsOnCurrentFloor`を閾値直前に設定した状態から`wait`を1回送ると、警告閾値では現在フロアのまま`winds-of-kron-warning`のみ記録され、排出閾値では実際にフロアが1つ進み`turnsOnCurrentFloor`が0にリセットされ`winds-of-kron-eviction`が記録されることを`dist/game/index.mjs`越しに確認した(素朴に200ターン`wait`し続けるスクリプトは空腹で先に餓死してしまうことが判明したため、直接閾値付近の状態を組み立てる方式に変更した)。テストは787件(前回776件から+11)すべて通過、型検査・lint・knip・buildも全てクリーン。`docs/idea-memo.md`の有力候補から2件目の採用が完了した。
**マイルストーン52完了(2026-07-15)。**

## マイルストーン53 — モンスターハウス(不思議のダンジョンシリーズの高リスク・高リターンな部屋)

`docs/idea-memo.md`で有力候補とした「不思議のダンジョンシリーズのモンスターハウス」(特定の部屋に足を踏み入れると大量の敵が一斉に湧く部屋)を採用する。ダンジョン生成時点の`dungeon.getRooms()`(`floor.ts`の`buildFloorLayout`がプレイヤー開始地点の決定にすでに使っている)から、プレイヤーの開始部屋以外を1つランダムに選び、通常の敵抽選プールとは独立にその部屋の内側だけへ追加の敵を`awake: true`(不意打ちではなく開始時から警戒済み)で配置する。新規`GameEvent`やGameStateの構造変更は不要——`Enemy.awake`は既存フィールドであり、生成物が増えるだけの純粋なダンジョン生成側の変更で完結する。

- [ ] `src/game/balance.ts`: `MONSTER_HOUSE_SPAWN_CHANCE_PERCENT = 15`(独立per-floor抽選、floor 1でも部屋が2つ以上あれば対象)・`MONSTER_HOUSE_ENEMY_COUNT = 4`(部屋に追加で湧く敵の数)を追加
- [ ] `src/game/floor.ts`: `buildFloorLayout`内で`dungeon.getRooms()`からプレイヤー開始部屋(`firstRoom`)を除いた部屋が1つ以上あり、`MONSTER_HOUSE_SPAWN_CHANCE_PERCENT`の抽選に当たったら、その中から1部屋をランダムに選ぶ。新規ヘルパー`drawSpawnTileInRoom(pool, room, rng)`(`pool`のうち部屋の内側`room.x1〜x2, room.y1〜y2`(inclusive、壁は1マス外側)に収まるタイルだけを対象に既存の`drawSpawnTile`と同じ「ランダムに1つ選んで`pool`から取り除く」動作をする)を使い、zombie/batを交互に`MONSTER_HOUSE_ENEMY_COUNT`体まで`awake: true`で配置する(通常の敵は`awake: false`で配置され初回接近時に起きるが、モンスターハウスの敵は入室した瞬間から警戒済みという原作の再現) + テスト
- [ ] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、複数シードのダンジョンを生成し、いずれかのフロアでプレイヤー開始部屋の外に`awake: true`の敵が固まって配置されるケースが実際に出現することを確認する

自動テスト(型検査・lint・Vitest・knip・build)が通過し、上記パイプライン確認が済んだら完了とする。

## バックログ(マイルストーン未整理)
- 持ち物の容量上限(マイルストーン10では無制限スタック。アイテム種が増えて意味を持つ段階になったら検討)
- ポーションのフレーバーテキストのランダム割り当て(マイルストーン23では見送り。`GameState`に人間向け文字列を直接持たせずに実現する方法——例えば`messages.ts`側でシードから決定的に導出する、または`GameState`にはフレーバー"インデックス"のみを整数で持たせ文字列プールへの変換は`messages.ts`に閉じ込める——が固まったら再検討)
- ブラウザデモ(`demo/main.js`)のステータスバーがマイルストーン20〜22(満腹度・所持金・わな)に追従できていない(今回`formatEvent`/`formatInventoryEntry`呼び出しのシグネチャ変更にだけ追従し、表示自体の拡充はスコープ外とした)。CLI版と表示内容を揃えたくなったら着手する
- `formatEvent`が描画のたびに現在の鑑定状態で評価されるため、鑑定済みになった潜在的アイテムの過去ログ行の表示が遡って変わる件(マイルストーン23で確認・許容と判断)。気になる場合はイベント発生時点の鑑定状態をpayloadに焼き込む設計に変更する
- 他の指輪効果の追加(マイルストーン31で再生の指輪、マイルストーン33で満腹の指輪=遅消化を実装。原作Rogueには他に怪力・耐久・索敵・透明視・瞬間移動・敵召喚・敏捷・防御・隠密などがある。マイルストーン33では「拾った時点では汎用名`指輪`のまま、効果は装備した瞬間に明かされる」という簡略化で決着した——鑑定リスト化はまだ不要)
- 他の未鑑定アイテムカテゴリの導入(マイルストーン23で確立した「`identifiedPotionKinds`的な鑑定リスト+`messages.ts`側での表示分岐」という型を横展開できる。巻物・指輪はどちらもこの型を使わない単純な形で導入した——将来的に未鑑定にしたくなったら再検討)
- ダメージの乱数幅(マイルストーン15で正規分布版`rollDamage`を実装したが撤回。`src/game/damage.ts`にユーティリティとテストを残してあるので、再導入時は`combat.ts`/`enemies.ts`から呼び直すだけで済む)
- スケジューラ接続(`src/scheduler/`のspeed schedulerは今も未使用。敵の速度差自体はマイルストーン9でプレーンデータ方式により解決済み — 上記参照。クロージャベースのSchedulerがリデューサの`GameState`と根本的に相性が悪いことが判明したため、実際に接続するとしたらリデューサ外の非ターン制な何かが対象になる)
- 扉ギミック(封印中): 鍵つき扉など「特殊な出入口」として意味を持たせられるようになったら再導入。ただの通過タイルなら不要(不思議のダンジョン系準拠)。焼き込み実装はコミット9cf29be、見分けづらさ・2マス通路問題は上記マイルストーン2の記録を参照
- 絵文字セット(100種程度)の選定(`docs/design.md` の未解決項目)
- 視界方式の再検討: 現行はshadowcasting(放射状・半径8)。オリジナルRogue/不思議のダンジョン式「部屋に入ったら部屋全体が見える+通路は周囲1マス」に変える場合は、部屋矩形をGameStateに保存する必要がある(diggerの`getRooms()`は生成時に捨てているため)。プレイフィールを見て判断
- リリース運用(正式リリースを始めるとき、2026-07-14の議論): ①アプリはsemver、セーブ形式は単調増加の整数、**両者は独立の軸**でCHANGELOGに対照表(アプリver↔形式ver)を記録 ②コードの互換判定は`formatVersion`のみ(アプリverをパースして判定に使わない) ③セーブに`appVersion`を参考情報として併記(サポート用、判定不使用) ④旧形式の切り捨てをやめる時期になったら`parseSaveFileContent`の`unsupported-version`分岐がマイグレーションの差し込み口 ⑤既製のsemverスキルはConventional Commits前提でGitmoji規約と不適合 — 必要になったら自作`/release`スキル(バンプ→CHANGELOG→タグ→push)を書く
