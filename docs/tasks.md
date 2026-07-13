# emoji-rogue タスクトラッカー

計画全文: `C:\Users\u83\.claude\plans\rot-js-rot-js-ts-1-fizzy-nygaard.md`(承認済み)。`develop`/`develop-loop` スキルはここを読んでタスクを選ぶ。

## Stage 1 — ツールチェーン近代化

- [x] `_old/`, `doc/`, `manual/`, `addons/` を削除(コードとしての移植価値なし)
- [x] `hp/`, `index.html`, `.nojekyll`, `build.dot`, `build.png`, `TODO`, `yarn.lock`, `examples/` を削除(rot.js本家のGitHub Pagesデモ・旧ビルド系残骸)
- [x] `lib/`, `dist/` をgit管理から除外し`.gitignore`に追加(ビルド生成物をコミットしない方針へ)
- [x] `package.json` 全面刷新: `emoji-rogue`に改名、`type: module`、`exports`マップ、ESM専業(CJSデュアル出力なし)、`engines.node >= 20`
- [x] `tsconfig.json` を厳格設定に更新(`target: ES2022`, `module`/`moduleResolution: NodeNext`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `jsx: react-jsx`, `include`ベースに変更)
- [x] `Makefile`/`rollup.config.js` 全廃、`tsup.config.ts` に一本化 → 後述の理由で **`tsdown.config.ts` に乗り換え済み**
- [x] `vitest.config.ts` 追加(`passWithNoTests: true`)
- [x] `biome.json` 追加、既存クラスベースコードに一度整形パスを実行
- [x] `src/display/` を先行削除(Stage 5でInkベースに完全置き換えのため、DOM lib依存の型エラーだけ今のうちに除去。5バックエンド全部・`tests/spec/display.js`も削除)
- [x] ビルドツールを `tsup` → `tsdown`(Rolldownベース)に乗り換え。理由: tsup公式READMEが「もうメンテされていない、tsdownへ移行を」と明記済み(tsup#1405/#1388/#1389が未解決のまま放置)。tsdownはTS7サポートを2026-07-09にクローズ済みで活発にメンテされている。乗り換えた結果、**`dts: true`のまま既存の型エラーが残っていてもビルド・宣言ファイル生成に成功する**(tsdownは型チェッカーではなくバンドラーという立場のため、tsupほど型エラーに厳格ではない)。TypeScriptも`5.9.3`固定を解除し`^7.0.2`(最新)に戻した。

### Stage 1で判明した既知の負債(Stage 3で解消予定、今は放置してよい)

- **`npm run typecheck`のエラー数の推移**: 396件(Stage 1)→ 377件(3.1)→ 367件(3.2)→ 357件(3.3)→ 290件(3.4)→ 43件(3.5)→ **0件(Stage 3.6完了時点)**。
- **`npm run lint`のerror数の推移**: 250件(Stage 1)→ 236件(3.1)→ 233件(3.2)→ 212件(3.3)→ 169件(3.4)→ 14件(3.5)→ **0件(Stage 3.6完了時点)**。
- **rot.jsフォーク全体のクラスベースコードの関数型変換がStage 3.6で完了し、typecheck/lintともにゼロ達成。**
- **`rng.ts`のトランジション用互換シムは削除済み。** `map/`が全てStage 3.5で明示引数`rng`受け取りに移行完了したため、`src/rng.ts`のデフォルトexport(事前生成済み`Rng`インスタンス)と`src/index.ts`からの再exportを削除した。これでコードベース全体からグローバル可変RNG参照が完全になくなった。

## Stage 2 — テスト移植(Stage 3と一体で進行、一括変換しない)

`tests/spec/*.js`(Jasmine)を、対応するサブシステムをStage 3で書き換える直前/同時に1本ずつVitestへ移植。配置は`foo.ts`の隣に`foo.test.ts`。

- [x] `util.test.ts`(Stage 3.1と同時)
- [x] `MinHeap.test.ts`(旧specなし、新規作成)
- [x] `eventqueue.test.ts`(Stage 3.1と同時)
- [x] `noise/simplex.test.ts`(旧specなし、新規作成。決定論性・rng依存の検証を追加)
- [x] `rng.test.ts`(Stage 3.2と同時。同一seedの`createRng`2つが独立して同一列を生成することを検証するテストを追加。旧specの精度検証済み定数値テスト(seed 12345 → 0.01198604702949524)も移植し一致確認済み)
- [x] `text.test.ts`(Stage 3.3と同時)
- [x] `color.test.ts`(旧spec移植。`randomize`のシグネチャ変更(`rng`引数追加)に追随)
- [x] `stringgenerator.test.ts`(旧specなし、新規作成。決定論性・`clear()`の挙動・word modeを検証)
- [x] `engine.test.ts`(Stage 3.6と同時。旧`tests/spec/engine.js`を移植。これが最後のJasmine specだったため、`tests/`(旧Jasmineランナー一式)を完全に削除)
- [x] `fov/fov.test.ts`(Stage 3.4と同時。discrete/precise/recursive(360/180/90度)全て検証)
- [x] `path/path.test.ts`(Stage 3.4と同時。Dijkstra/A*の4/6/8-topology、A*の効率性テスト(400 visits)も含めて移植)
- [x] `scheduler/scheduler.test.ts`(Stage 3.4と同時。Simple/Speed/Action全て、Zero-ID actorケースも移植)
- [x] `map/dungeon.test.ts`(Stage 3.5と同時。旧`tests/spec/dungeon.js`をDigger/Uniform共通のパラメータ化テストとして移植)
- [x] `map/generators.test.ts`(旧specなし、新規作成。Arena/Cellular/DividedMaze/EllerMaze/IceyMaze/Rogueの構造的なスモークテスト — 全セルが埋まる、値が0/1のみ、等)

## Stage 3 — サブシステム別・関数型書き換え

### 3.1 真の末端(完了)
- [x] `util.ts`(`format.map`のfunction-static-propertyハックを`formatMap`という通常のexportに整理、`any[]`を`unknown[]`に)
- [x] `MinHeap.ts`(クラス→`createMinHeap<T>()`ファクトリ。`debugPrint`は未使用のため削除)
- [x] `constants.ts`(元々データのみでクラスラッパーなし。`DIRS`への`as const`化は見送り — `path.ts`/`fov.ts`/`map/*.ts`がまだ可変`number[][]`型を期待しており、Stage 3.4/3.5でそちら側を変換する際に合わせて検討)
- [x] `eventqueue.ts`(クラス→`createEventQueue<T>()`ファクトリ、`MinHeap`を利用)
- [x] `noise/`(`Noise`抽象クラス+`Simplex`クラス→`NoiseSource`型 + `createSimplexNoise(rng, gradients)`ファクトリ。RNG依存は`ShuffleSource`型で明示引数化 — 3.2で`createRng()`ができたらそちらを渡せる形に既になっている)
- [x] 呼び出し側の最小限の追随: `scheduler/scheduler.ts`(まだクラスのまま、`EventQueue`のimportのみ`createEventQueue`に追随。本格的な関数化はStage 3.4で)、`src/index.ts`(公開APIの形が`ROT.EventQueue`/`ROT.Noise.Simplex`のような名前空間スタイルから`createEventQueue`/`createSimplexNoise`のフラットな名前付きexportに変化)

### 3.2 `rng.ts`(グローバルシングルトン廃止、完了 — ただし互換シムあり)
- [x] `RngState`型(`s0,s1,s2,c`。原型の`getState()`/`setState()`が元々seedを含まない4要素配列だったことに合わせた) + `stepUniform`純粋関数を定義
- [x] `createRng(seed)`ファクトリを実装(内部でstateをクロージャに閉じ込める。`getSeed`用のseed値も同様にクロージャで保持)
- [x] `getWeightedValue`をジェネリクス化し`Record<K, number> => K`に(空データはthrow、フォールバックの最終キーもthrowで守る)
- [x] `src/index.ts`から`createRng`/`Rng`/`RngState`を公開APIとしてexport
- [x] `stringgenerator.ts`・`color.ts`をStage 3.3で明示引数`rng`受け取りに移行済み
- [ ] **未完了**: `map/`(Stage 3.5)が移行し終えたら`src/rng.ts`のデフォルトexport(互換シム)を削除する

### 3.3 テキスト/文字列生成(完了)
- [x] `text.ts`: `TYPE_TEXT`等の数値マジック定数(0/1/2/3) → 判別可能union型`Token`(`{type:"text"|"newline"|"fg"|"bg", ...}`)に変換。`any[]`を`Token[]`に。ロジック自体は既に純粋関数ベースだったため大きな構造変更はなし。**Result型の導入は見送り**: 現状のトークナイザは寛容なスキャナで(未終端の`%c{`等も単なるテキストとして扱われる)、人為的に「不正な書式文字列」というエラーケースを作り出すことになり、既存動作を変えずに済ませられないため。Stage 4のResult型実例は`path/`・`map/`の2つで足りると判断(要`docs/tasks.md`のStage 4更新時に再確認)
- [x] `stringgenerator.ts`: クラス→`createStringGenerator(rng, options)`ファクトリに変換。`RNG`互換シムから明示的な`rng`引数受け取りに移行。`getWeightedValue`のジェネリクス化により`as string`キャストが不要に。`clear()`が境界値のprior(`_boundary`)を再設定しない、という原型の挙動(一種のクセ)はそのまま保持(動作変更を避けるため)
- [x] `color.ts`: `randomize(color, diff)` → `randomize(rng, color, diff)`に変更しRNG互換シムから移行(内部呼び出しなし、安全な変更と確認済み)

### 3.4 `fov/`, `path/`, `scheduler/`(完了)
- [x] `fov/`: `Fov`関数型契約(`(x,y,radius,callback)=>void`) + `createDiscreteShadowcastingFov`/`createPreciseShadowcastingFov`/`createRecursiveShadowcastingFov`ファクトリに変換。`_getCircle`を独立純粋関数`getCircle(topology,cx,cy,r)`へ。`RecursiveShadowcasting`固有の`compute180`/`compute90`は`RecursiveShadowcastingFov`インターフェース(`{compute, compute180, compute90}`)として維持
- [x] `path/`: `Path`関数型契約(`(fromX,fromY,callback)=>void`) + `createAStarPath`/`createDijkstraPath`ファクトリに変換。`_getNeighbors`を独立純粋関数`getNeighbors(dirs,passable,cx,cy)`へ、方向ベクトルの並び替えロジックを`getPathDirs(topology)`へ切り出し。**Dijkstraの探索フロンティアの永続キャッシュ(複数回の`compute()`呼び出しをまたいで再利用する挙動)はファクトリのクロージャで維持**(元のクラスがコンストラクタで`_computed`/`_todo`を保持していたのと同じ設計意図)。`ComputeCallback`の戻り値型を`any`→`void`に厳格化(戻り値を使っている形跡なし)
- [x] `scheduler/`: `Scheduler<T=any>`の`any`を排除しジェネリクス化。`createScheduler`/`createSimpleScheduler`/`createSpeedScheduler`/`createActionScheduler`へ変換。継承の代わりに、共有ロジック(`addToRepeatList`/`clearSchedulerState`/`removeFromSchedulerState`/`advanceScheduler`)を`SchedulerState<T>`という素データに対する関数として`scheduler.ts`から公開し、各バリアントがそれを呼び出しつつ固有ロジック(`add`/`next`の上書きなど)を追加する形(継承ではなく合成)。`Speed`/`Action`は`add`に第3引数`time?`を取る拡張インターフェース(`SpeedScheduler`/`ActionScheduler`)として型付け
- [x] 呼び出し側の最小限の追随: `src/lighting.ts`(`FOV`型→`Fov`型、`this._fov.compute(...)`→`this._fov(...)`に。まだクラスのまま、本格変換はどのステージにも明記されていないため据え置き)、`src/engine.ts`(`Scheduler`型→`Scheduler<Actor>`型、`Actor`インターフェースを新規定義。まだクラスのまま)

### 3.5 `map/`(最重量、完了)
- [x] `map.ts`: `Map`抽象クラス廃止、`fillMap(width,height,value)`純粋関数 + `CreateCallback`型のみに縮小
- [x] `arena.ts`: `createArenaMap(width,height,callback)`という単純な関数に(状態を持たないため、ファクトリオブジェクトにせず直接関数呼び出しに)
- [x] `cellular.ts`: クラス→`createCellularMap(width,height,options)`ファクトリ(`randomize`/`setOptions`/`set`/`create`/`connect`の複数メソッドを持つため、状態をクロージャで保持するファクトリオブジェクトに)。`_dirs`が構築時に一度だけ計算され`setOptions()`後も再計算されない、という原型の挙動(クセ)はそのまま保持
- [x] 迷路系(`dividedmaze.ts`/`ellermaze.ts`/`iceymaze.ts`): いずれも単発`create`のみのため単純な関数に
- [x] `features.ts`: `Feature`抽象クラス+`Room`/`Corridor`クラス → 判別可能union型`Feature = Room | Corridor`(`{kind:"room"|"corridor", ...}`) + 独立関数群(`createRoomAt`/`createRoomAtCenter`/`createRandomRoom`/`createCorridorAt`/`roomIsValid`/`corridorIsValid`/`digRoom`/`digCorridor`等)へ。`corridorIsValid`が検証中にcorridorのendX/endYを短縮する、という原型の副作用ありバリデーションの挙動はそのまま保持
- [x] `dungeon.ts`: `Dungeon`抽象クラス廃止、`getRooms()`/`getCorridors()`を持つ`DungeonMap`共有インターフェースのみに縮小
- [x] `uniform.ts`: クラス→`createUniformMap(width,height,rng,options)`ファクトリ。タイムリミット到達時に`null`を返していた原型の挙動は、Stage 4で`Result<UniformMap, GenerationTimedOut>`に置き換え済み(下記参照)
- [x] `digger.ts`(最難): クラス→`createDiggerMap(width,height,rng,options)`ファクトリ。`FEATURES`レジストリを`Record<FeatureType, CreateFeatureAt>`として型付けし、`createRoomAt`/`createCorridorAt`をそのまま登録することで`as FeatureType`/`as FeatureConstructor`という不安全なキャストを完全に排除
- [x] `rogue.ts`: クラス→`createRogueMap(width,height,rng,options)`ファクトリ。**変換中に発見・修正したバグ**: `_connectRooms`の外側`do-while`ループ(ランダムウォークで接続先セルを広げていくロジック)を最初`while(false)`と誤って書いてしまい1パスしか回らなくなっていたが、原型を再確認して`while(dirToCheck.length > 0)`という正しい継続条件に修正済み(テストは通っていたが、たまたま影響が出にくいケースだった可能性があるため要注意の修正点として記録)
- [x] **`encodePointKey`共有ヘルパーは導入しなかった**: 元々`digger.ts`/`uniform.ts`は`"x,y"`区切り、`cellular.ts`は`"x.y"`区切りと、ファイルごとに異なるキー形式を使っていたため、1つの共有関数に統一すると動作変更になってしまう。代わりに各ファイル内でテンプレートリテラル(`` `${x},${y}` ``等)を一貫して使うことで、直書き文字列結合によるタイポリスクという当初の懸念は解消した
- [x] RNG互換シムからの移行完了(`map/`の全ファイルが`rng`を明示引数で受け取る)。`src/rng.ts`のデフォルトexportを削除(Stage 3.2参照)
- [x] `src/lighting.ts`・`src/engine.ts`(どのステージにも明記されていなかった残り)もStage 3.6で関数型に変換完了。詳細は下記参照

## Stage 4 — Result型エラーハンドリング(完了)

- [x] 非chainingの`Result<T, E>`/`ok`/`err`を`src/result.ts`に実装。`.andThen()`等のチェーンAPIは持たず、早期return(`if (!result.ok) return err(...)`)イディオムのみ
- [x] `path/`: `Path`型の戻り値を`void`→`Result<void, NoPathFound>`に変更(`NoPathFound = "no-path-found"`)。`createAStarPath`/`createDijkstraPath`の両方で、経路が見つからない場合に`err("no-path-found")`を返すよう変更。callbackが呼ばれる(または呼ばれない)という既存の挙動はそのまま維持しつつ、明示的な成否シグナルを追加
- [x] `map/`: `UniformMap.create()`の戻り値を`UniformMap | null`→`Result<UniformMap, GenerationTimedOut>`に変更(`GenerationTimedOut = "generation-timed-out"`)。`DiggerMap.create()`はタイムリミットに達しても部分的な結果を静かに受け入れて返すだけなので、Result化の対象外(失敗ではないため)のまま
- [x] `text.ts`へのResult型導入は見送り(Stage 3.3で判断済み)
- [x] throwのまま残す箇所にコメントを追加: `fov.ts`の`getCircle`の不正topology、`path/astar.ts`の`distance`の不正topology、`map/features.ts`の`createRoomAt`のdx/dy不正値。いずれも「型システムが正しく機能していれば到達しないはずの呼び出し側バグ」であることを明記
- [x] `src/index.ts`から`Result`/`ok`/`err`/`NoPathFound`/`GenerationTimedOut`を公開APIとしてexport
- [x] `path/path.test.ts`・`map/dungeon.test.ts`にResult型の成功/失敗ケースのテストを追加(Uniformの`generation-timed-out`は、10x10マップに100x100のroomWidth/roomHeightを指定して確実にタイムアウトさせるテストで検証)

## Stage 3.6 — 残っていたクラス(`lighting.ts`/`engine.ts`)+`color.ts`の後始末(完了)

Stage 3.1〜3.5のどこにも明記されていなかった残りの後始末。これでコードベース全体のtypecheck/lintがゼロになった。

- [x] `color.ts`: タプル(`Color`)への数値変数インデックスアクセスに`at3()`ヘルパーを導入。`randomize()`のunion型(`number|Color`)インデックスアクセスを`Array.isArray()`分岐に書き換え。暗黙any・代入式内代入・`==`・`instanceof Array`もあわせて解消
- [x] `lighting.ts`: `Lighting`クラス→`createLighting(reflectivityCallback, options)`ファクトリに変換。`"x,y"`キー解析を`parseKey()`ヘルパーに、`LightColor`タプルへのアクセスを`at3()`ヘルパーに集約。`setFOV()`未呼び出しで`compute()`した場合、原型は`undefined`呼び出しで暗黙的にクラッシュしていたが、明示的なthrowに変更(呼び出し側のバグであることが分かりやすくなった、という意図的な改善)
- [x] `engine.ts`: `Engine`クラス→`createEngine(scheduler)`ファクトリに変換。ロックカウンタをクロージャ変数に
- [x] `engine.test.ts`(Stage 2参照)を追加し、旧`tests/spec/engine.js`を移植。これで全Jasmine specの移植が完了したため、`tests/`(旧Jasmineランナー一式: `run.js`, `index.html`, `spec/`)を完全に削除
- [x] `src/index.ts`の公開APIを`createLighting`/`createEngine`のフラットな名前付きexportに更新

## Stage 5 — 新レンダラー(`src/renderer/`、Ink採用)(完了)

- [x] `gridFrom(map, glyphs, fallback): Cell[][]` 純粋関数。当初計画の`gridFrom(gameState)`ではなく、現状コードベースに実在する`map/`生成器の列優先(`map[x][y]`)出力を受け取る形に調整(player/entity/turnを持つ「GameState」型はまだ存在しないため)
- [x] `groupIntoRuns(cells): CellRun[]` 純粋関数(同じfg/bgが連続するセルを1ランに集約)
- [x] `<MapRow>`/`<GameScreen>` Inkコンポーネント(セル単位`<Box>`は使わない。ランごとに`<Text color backgroundColor>`を並べるのみ)
- [x] `ink-testing-library`でdesign.mdの絵文字セットに対する`lastFrame()`スナップショットテスト(バリエーションセレクタ付き絵文字 ⚠️・🌡️ を含めて、幅崩れがないことを確認する回帰テストとして`GameScreen.test.tsx`に実装)
- [x] Windows Terminal上での実機スモークテスト —  `scripts/demo-renderer.mjs`で40x20のダンジョンを実機確認。初回は床タイルに半角中黒「・」(Unicode East Asian Widthが「Ambiguous」区分)を使っており1-2px左寄りに見えるズレが発生したが、design.mdの「幅が不安定な文字を避ける」方針通り安定した2カラム幅の絵文字🟫に差し替えて解消。壁🧱・扉🚪含め絵文字グリッドが崩れずに描画されることを確認済み

## Stage 6 — `.claude/` rules/skills/docs整備

- [x] `docs/tasks.md`(本ファイル)
- [x] `CLAUDE.md`
- [x] `.claude/rules/typescript.md`
- [x] `.claude/rules/functional-style.md`
- [x] `.claude/rules/error-handling.md`
- [x] `.claude/rules/file-structure.md`
- [x] `.claude/rules/naming.md`
- [x] `.claude/rules/constraints.md`
- [x] `.claude/rules/commits.md`
- [x] `.claude/skills/develop/SKILL.md`
- [x] `.claude/skills/develop-loop/SKILL.md`
- [x] `.claude/skills/grill-me/SKILL.md`

## 全ステージ完了後のエンジニアリング改善(2026-07-13)

原本rot.jsとの全サブシステム突き合わせ検証(挙動・乱数消費順まで一致を確認)の後に実施。

- [x] GitHub Actions CI(push/PR毎にtypecheck・lint・knip・test・build)
- [x] map生成器のseed総当たり不変条件テスト(`src/map/invariants.test.ts`。25シード×各生成器で床の全連結・外周壁・値域・決定性を検証。rogueは原本アルゴリズムが全連結を保証しないため連結性は対象外)
- [x] knip導入(未使用ファイル・export検出。導入時にrendererバレル未経由・`lerp`/`lerpHSL`死にエイリアスを検出し解消)
- [x] 重複ヘルパーの集約: `src/indexing.ts`(`at`/`toXy`)・`src/pointkey.ts`(`encodePointKey`/`decodePointKey`。原本由来の「x,y」「x.y」キー混在を解消)
- [x] 検証レビューの指摘対応: `rng.clone()`のseed引き継ぎ、デバッグ用console出力の削除、discrete-shadowcastingの`as number`キャスト除去

### 次の設計課題

2026-07-13に相談し方針決定。

- [ ] ゲーム層の設計: 純粋リデューサ`advanceTurn(state, action): GameState` + `RngState`をGameStateに含める方式を**採用**(セーブ・リプレイ・シード共有がほぼ無料になる)。関数値(`passable`等)はGameStateに入れず、地形はデータとして持ち`isPassable(state.map, x, y)`のような純粋関数で導出する
- [x] `createDijkstraPath`の呼び出し間キャッシュは**廃止**(2026-07-13)。呼び出しごとに探索し直す方式に変更し、地形変化が常に反映されることをテストで保証。ターン制・この規模のマップでは性能影響は無視できる。将来プロファイルで経路計算がボトルネックになった場合は、キャッシュ復活ではなくプレイヤー起点の距離場(Dijkstraマップ)をターンごとに純粋導出する方式を採る
