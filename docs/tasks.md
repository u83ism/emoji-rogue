# emoji-rogue タスクトラッカー

計画全文: `C:\Users\u83\.claude\plans\rot-js-rot-js-ts-1-fizzy-nygaard.md`(承認済み)。`develop`/`develop-loop` スキルはここを読んでタスクを選ぶ。

## Stage 1 — ツールチェーン近代化

- [x] `_old/`, `doc/`, `manual/`, `addons/` を削除(コードとしての移植価値なし)
- [x] `hp/`, `index.html`, `.nojekyll`, `build.dot`, `build.png`, `TODO`, `yarn.lock`, `examples/` を削除(rot.js本家のGitHub Pagesデモ・旧ビルド系残骸)
- [x] `lib/`, `dist/` をgit管理から除外し`.gitignore`に追加(ビルド生成物をコミットしない方針へ)
- [x] `package.json` 全面刷新: `emoji-rogue`に改名、`type: module`、`exports`マップ、ESM専業(CJSデュアル出力なし)、`engines.node >= 20`
- [x] `tsconfig.json` を厳格設定に更新(`target: ES2022`, `module`/`moduleResolution: NodeNext`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `jsx: react-jsx`, `include`ベースに変更)
- [x] `Makefile`/`rollup.config.js` 全廃、`tsup.config.ts` に一本化
- [x] `vitest.config.ts` 追加(`passWithNoTests: true`)
- [x] `biome.json` 追加、既存クラスベースコードに一度整形パスを実行
- [x] `src/display/` を先行削除(Stage 5でInkベースに完全置き換えのため、DOM lib依存の型エラーだけ今のうちに除去。5バックエンド全部・`tests/spec/display.js`も削除)

### Stage 1で判明した既知の負債(Stage 3で解消予定、今は放置してよい)

- **TypeScriptバージョンはひとまず `5.9.3` に固定**(devDependencies参照)。`typescript@latest`(7.0.2)および`6.0.3`は、tsupが内蔵する`rollup-plugin-dts`との内部API不整合でdts生成がクラッシュする(現時点のエコシステムがTS7系の内部変更に追いついていない)。将来tsup側が対応したら最新化を検討。
- **`tsup.config.ts`の`dts: false`は暫定措置**。理由: dts生成は型チェックを伴うため、下記の既存型エラーが解消されるまで有効化できない。Stage 3で対象サブシステムの型エラーが消えるごとに、最終的に全て解消したら`dts: true`に戻す。
- **`npm run typecheck`は現時点で396件のエラーが出る**(内訳の大半は`noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`が拾う「配列アクセスがundefinedかもしれない」系。主に`map/`(254件相当)、`fov/`、`path/`、`noise/`、`rng.ts`、`stringgenerator.ts`)。これはStage 3で該当ファイルを関数型に書き換えるたびに自然に減っていく想定。**Stage 3完了の定量的な目安はこのエラー数がゼロになること。**
- **`npm run lint`は現時点で250件のerror**(大半は`any`実使用・`==`・グローバル`Map`のシャドーイングなど、Stage 3で解消される旧OOPコードの実質的な問題。Biomeの自動整形は既に適用済みで、残っているのはロジックレベルの指摘のみ)。

## Stage 2 — テスト移植(Stage 3と一体で進行、一括変換しない)

`tests/spec/*.js`(Jasmine)を、対応するサブシステムをStage 3で書き換える直前/同時に1本ずつVitestへ移植。配置は`foo.ts`の隣に`foo.test.ts`。

- [ ] `util.test.ts`(Stage 3.1と同時)
- [ ] `eventqueue.test.ts`(Stage 3.1と同時)
- [ ] `rng.test.ts`(Stage 3.2と同時。同一seedの`createRng`2つが独立して同一列を生成することを検証するテストを新規追加)
- [ ] `text.test.ts`(Stage 3.3と同時)
- [ ] `color.test.ts`, `engine.test.ts`(小さめ、任意のタイミングで)
- [ ] `fov.test.ts`(Stage 3.4と同時)
- [ ] `path.test.ts`(Stage 3.4と同時)
- [ ] `scheduler.test.ts`(Stage 3.4と同時)
- [ ] `dungeon.test.ts` → `map/`配下に分割(Stage 3.5と同時、最後)

## Stage 3 — サブシステム別・関数型書き換え

### 3.1 真の末端
- [ ] `util.ts`
- [ ] `MinHeap.ts`
- [ ] `constants.ts`(データのみか確認、クラスラッパーがあれば除去)
- [ ] `eventqueue.ts`
- [ ] `noise/`(base + simplex)

### 3.2 `rng.ts`(グローバルシングルトン廃止、最重要)
- [ ] `RngState`型 + `stepUniform`純粋関数を定義
- [ ] `createRng(seed)`ファクトリを実装(内部でstateをクロージャに閉じ込める)
- [ ] 全呼び出し元(`map/digger.ts`ほか)を、importされるグローバルではなく明示引数`rng`受け取りに変更
- [ ] `getWeightedValue`をジェネリクス化し`Record<K, number> => K`に

### 3.3 テキスト/文字列生成
- [ ] `text.ts`(`%c{}`/`%b{}`トークナイザ、Stage 4のResult型実例)
- [ ] `stringgenerator.ts`

### 3.4 `fov/`, `path/`, `scheduler/`
- [ ] `fov/`: 関数型契約 + 各アルゴリズムの独立ファクトリに変換、`_getCircle`等を独立純粋関数へ
- [ ] `path/`: 同上、`_getNeighbors`等を独立純粋関数へ
- [ ] `scheduler/`: `Scheduler<T=any>`の`any`排除、`createScheduler`/`createSimpleScheduler`/`createSpeedScheduler`/`createActionScheduler`へ

### 3.5 `map/`(最重量、最後)
- [ ] `arena.ts`/`cellular.ts`/`uniform.ts`(簡単な生成器でパターン確立)
- [ ] 迷路系(`dividedmaze.ts`/`ellermaze.ts`/`iceymaze.ts`)
- [ ] `encodePointKey(x, y)`ヘルパー導入、`"x,y"`文字列結合の直書きを置き換え
- [ ] `features.ts`: `Feature`/`Room`/`Corridor`クラス → 判別可能union + 独立関数へ
- [ ] `digger.ts` + `FEATURES`レジストリの型付け(最難、最後)
- [ ] `rogue.ts`(digger/features整理後)

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
