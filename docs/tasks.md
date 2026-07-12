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

- **`npm run typecheck`のエラー数はStage 3の進捗に応じて減少中**: 396件(Stage 1完了時点)→ 377件(Stage 3.1)→ 367件(Stage 3.2)→ 357件(Stage 3.3)→ 290件(Stage 3.4完了時点、`fov/`・`path/`分が解消)。残りは全て`map/`(Stage 3.5)。**Stage 3完了の定量的な目安はこのエラー数がゼロになること。**
- **`npm run lint`のerror数も同様に減少中**: 250件(Stage 1完了時点)→ 236件(Stage 3.1)→ 233件(Stage 3.2)→ 212件(Stage 3.3)→ 169件(Stage 3.4完了時点)。残りは大半が`any`実使用・`==`・グローバル`Map`のシャドーイングなど、`map/`に残る旧OOPコードの実質的な問題。
- **`rng.ts`のトランジション用互換シムは、`map/`の移行が完了するまで残る。** `stringgenerator.ts`・`color.ts`はStage 3.3で明示的な`rng`引数受け取りに移行済み。残りは`map/`(Stage 3.5)のみ。移行が全て完了したら`src/rng.ts`のデフォルトexport(互換シム)を削除する。

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
- [ ] `engine.test.ts`(小さめ、任意のタイミングで)
- [x] `fov/fov.test.ts`(Stage 3.4と同時。discrete/precise/recursive(360/180/90度)全て検証)
- [x] `path/path.test.ts`(Stage 3.4と同時。Dijkstra/A*の4/6/8-topology、A*の効率性テスト(400 visits)も含めて移植)
- [x] `scheduler/scheduler.test.ts`(Stage 3.4と同時。Simple/Speed/Action全て、Zero-ID actorケースも移植)
- [ ] `dungeon.test.ts` → `map/`配下に分割(Stage 3.5と同時、最後)

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

### 3.5 `map/`(最重量、最後)
- [ ] `arena.ts`/`cellular.ts`/`uniform.ts`(簡単な生成器でパターン確立)
- [ ] 迷路系(`dividedmaze.ts`/`ellermaze.ts`/`iceymaze.ts`)
- [ ] `encodePointKey(x, y)`ヘルパー導入、`"x,y"`文字列結合の直書きを置き換え
- [ ] `features.ts`: `Feature`/`Room`/`Corridor`クラス → 判別可能union + 独立関数へ
- [ ] `digger.ts` + `FEATURES`レジストリの型付け(最難、最後)
- [ ] `rogue.ts`(digger/features整理後)
- [ ] **どのステージにも明記されていない残り**: `src/lighting.ts`・`src/engine.ts`はまだクラスのまま(それぞれ3.4のfov/scheduler型変更への追随のみ実施)。Stage 3.5完了後、この2ファイルも関数型に変換するかは要検討(現状は動くのでブロッカーではない)

## Stage 4 — Result型エラーハンドリング(3.4/3.5と並行、別パスにしない)

- [ ] 非chainingの`Result<T, E>`/`ok`/`err`を実装(場所は要検討、`src/result.ts`など)
- [ ] `path/`: 経路なしを`Result`化
- [ ] `map/`: 不正な生成オプションを`Result`化
- [ ] `text.ts`: 不正な書式文字列を`Result`化
- [ ] throwのまま残す箇所(fov.tsの不正topology等)を確認し、意図的にthrowのままであることをコメントで明記

## Stage 5 — 新レンダラー(`src/renderer/`、Ink採用)

- [ ] `gridFrom(gameState): Cell[][]` 純粋関数
- [ ] `groupIntoRuns(cells): CellRun[]` 純粋関数
- [ ] `<MapRow>`/`<GameScreen>` Inkコンポーネント(セル単位`<Box>`は使わない)
- [ ] `ink-testing-library`でdesign.mdの絵文字セットに対する`lastFrame()`スナップショットテスト
- [ ] Windows Terminal上での実機スモークテスト

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
