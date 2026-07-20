# emoji-rogue ゲーム開発タスクトラッカー

ゲーム実装(GameState・入力ループ・敵・UI)の現行トラッカー。`develop` スキルはここを読んでタスクを選ぶ。**完了したマイルストーンは原文のまま `docs/tasks/game-history.md` へ移す運用**(2026-07-18導入。マイルストーン1〜67は移設済み — 「なぜこの仕様か」を遡るときはそちらを参照)。近代化改修(rot.jsフォークの関数型変換)の履歴は `docs/tasks/modernization.md`(タグ `modernization-complete` が完了地点)。

## ゲーム層の設計方針(2026-07-13決定)

- ゲーム層は純粋リデューサ `advanceTurn(state: GameState, action: Action): GameState`。シェル(入力読み取り・描画)だけが命令的レイヤー
- `RngState` を `GameState` に含める。乱数消費は必ず状態経由 → セーブ(GameStateのシリアライズ)・リプレイ(初期状態+アクションログ)・シード共有(デイリーチャレンジ)が構造的にほぼ無料になる
- 関数値(`passable` コールバック等)は `GameState` に入れない(シリアライズ不能・純粋性を壊す)。地形はデータとして持ち、`isPassable(state.map, x, y)` のような純粋関数で導出する
- `Action` は判別可能union(`{ type: "...", payload: {...} }`)
- 経路計算が将来ボトルネックになったら、キャッシュではなくプレイヤー起点の距離場(Dijkstraマップ)のターンごと純粋導出で対応する(`docs/tasks/modernization.md` 末尾の決定を参照)
- **ログとシステム通知の区別(2026-07-14決定)**: メッセージログ=**ゲーム世界の中の出来事**(戦闘、将来のアイテム取得・階層移動)だけを流す。`GameEvent`になりセーブ/リプレイに載る。システム通知=**アプリ/セッションの都合**(セーブしました、全角入力警告)はシェルの持ち物で、`GameState`に入れずログと1行空けて表示する。核がシェルの効果(ファイル書き込み等)を先取りしてイベント化しない。文体でも区別: ログは常体(「たおした!」)、通知はですます調(「セーブしました」)
- **i18n規律(2026-07-13決定)**: `GameState`・`Action`・将来のイベント/メッセージログに人間向け文字列を入れない。核は常にデータ(判別可能union、例: `{type:"player-hit", payload:{by:"zombie", damage:3}}`)を出し、文言化はシェル側の1箇所(将来のロケール差し替え点)に集約する。i18nライブラリの導入は実際に多言語化するときまで不要。絵文字は言語中立なので翻訳面積は元々小さい。日本語等のCJK文言はchrome行限定(マップグリッドに文字列を混ぜない既存規律の適用)

## マイルストーン68 — ステータスバーの最上段化と絵文字ラベル化(2026-07-18裁可)

不思議のダンジョン系のレイアウトに合わせ、ステータス行をマップの上へ移動。あわせて満腹度→🍖・攻撃力→💪・防御力→🦺の絵文字ラベルに(🍖🦺は**アイテムのグリフと同一**にして「拾った物と、それで動く数値が同じ顔」という対応を作る狙い)。階数「1F」・レベル「Lv.」・「HP」は文字維持(絵文字候補が安定基準違反(🪜)・VS16必須(❤️)・マップグリフと衝突(🔽)のいずれかのため)。

- [x] マイルストーン5の「chromeに絵文字禁止」ルールを改訂: タイルと同じ安定基準(単一コードポイント・VS16不要・EAW Wide)+実機確認済みの絵文字はchrome可(💰が先例)。architecture.mdのレンダラー設計判断に反映
- [x] `src/main.tsx`: `<StatusBar>`をマップの上に移動。`demo/index.html`も同順に
- [x] `shell/statusBar.tsx`・`demo/main.js`: 🍖/💪/🦺ラベル化
- [x] 実機スモークテスト: 最上段表示・絵文字ラベルの幅ズレ/折り返しがないこと(2026-07-18、Windows Terminalで確認済み)

自動テスト(型検査・lint・Vitest 767件・knip・build)は通過済み。
**マイルストーン68完了(2026-07-18)。**

## マイルストーン69 — フォーク層の`function`宣言を全てアロー関数に統一(2026-07-18)

functional-style.mdの「`const`+アロー優先」はゲーム層・シェル層では徹底済みだったが、フォーク層(+renderer)に`function`宣言が185箇所(テスト内ヘルパー含む)残っていた=規則と実態の乖離が黙認状態だった。本人の明示的な要望により全変換。構文のみの置き換えで挙動不変(クラス皆無のため`this`/`arguments`依存が存在せず、アロー化で意味が変わるパターンがない)。

- [x] 変換スクリプト(行ベースの状態機械)で一括変換: `map/`92 → `fov/path/scheduler/noise`27 → ルート直下ユーティリティ59 → `renderer/`7 の4バッチ、各バッチでパイプライン全green
- [x] スクリプトの取りこぼし1件を手修正: `MapRow.tsx`の`colorProps`(戻り値型が**オブジェクトリテラル型**で`): {`改行のケース — 型の開き括弧を関数本体と誤認)。全体grepで同型の被害が他に無いことを確認
- [x] 挙動保存の根拠: rngの原本一致検証(乱数消費順)・map不変条件(25シード×全生成器)・全767件が同一結果で通過。`src`配下の`function`宣言は0に

**マイルストーン69完了(2026-07-18)。**

## マイルストーン70 — アイテムウィンドウをマップと排他表示に(2026-07-18)

持ち物パネルがログの下にぶら下がる表示だったのを、**開いている間はマップを隠してその領域に表示**する不思議のダンジョン式に変更。マップと同じ高さの枠に収めるため、ステータスバーとログの位置は開閉で動かない。カーソル選択UI(バックログのUXテーマ)がこの領域をそのまま使う布石でもある。

- [x] `src/main.tsx`: `<GameScreen>`と`<InventoryOverlay>`を条件で入れ替え(パネルは`height={MAP_HEIGHT}`の枠内)。ログ下の旧表示は撤去
- [x] `shell/inventoryOverlay.tsx`: 最上部表示になったため`marginTop`を撤去
- [x] `demo/`: マップ`hidden`切り替えで同じ排他に。DOM順もCLIと同じ「ステータス→マップ/パネル→ログ」に
- [x] 留意: 所持アイテム種が枠(マップ高さ-枠線2行)を超えると溢れる edge case は許容(現実的に17種同時所持は稀。スクロールはカーソルUI導入時に一緒に)
- [x] 実機スモークテスト1回目(2026-07-18): **開閉でステータスバーが消える(1行ズレ)問題を検出** → パネル幅がターミナル全幅にストレッチされ、全幅ちょうどの枠線行が折り返して全体を1行押し上げる仮説で、幅をマップと同じ80桁(`MAP_WIDTH*2`)に固定する修正を実施
- [x] 実機スモークテスト2回目: 幅固定後、開閉でステータスバーが消えないことを確認(2026-07-18)。「全幅ちょうどの枠線行が折り返して全体を押し上げる」仮説が実証された — **Inkで全幅ストレッチされる枠付きBoxは行折り返しの地雷**という知見として記録(chrome部品は明示的な幅指定を基本とする)

自動テスト(型検査・lint・Vitest 767件・knip・build)通過済み。
**マイルストーン70完了(2026-07-18)。**

## マイルストーン71 — 敵・アイテム・わなカタログのSSOT生成(2026-07-18)

一覧ドキュメントを手書きせず、ゲームが実際に参照しているテーブル群(kindカタログ・balance・glyphs・gameNames)から`docs/catalog.md`を**生成**する方式を採用。手書き表はM56のような一斉バランス調整で即座に全行嘘になるため。

- [x] `src/shell/catalogData.ts`(共有型+敵・わな)・`potionCatalog.ts`(薬10種)・`itemCatalog.ts`(残り13種+合成): 唯一存在しなかった「効果・習性の説明文」をデータ化。**説明文中の数値は全てbalance定数のテンプレート補間**(手打ち禁止)なので、バランス変更が再生成で説明文にも反映される。`Record<Kind, ...>`なのでkind追加時のエントリ書き忘れはコンパイルエラー。将来のゲーム内図鑑(UXテーマ)にそのまま流用可能
- [x] `src/shell/catalog.ts`: `buildCatalogMarkdown()`(純関数)。敵(絵文字・名前・HP・攻撃・行動/T・経験値・出現・習性)/アイテム(分類別、拾った時の表示は`resolveItemDisplayName`で導出)/わなの3表+共通仕様のプローズ
- [x] `scripts/generate-catalog.mjs`+`npm run docs:catalog`(build込み): dist経由で`docs/catalog.md`を書き出し(replay-verify.mjsと同じパターン)
- [x] **鮮度の機械的保証**: `catalog.test.ts`が「コミット済みdocs/catalog.md === buildCatalogMarkdown()」を等価比較(CRLF正規化済み)。**再生成を忘れるとnpm testが赤くなる**
- [x] 構造lintが初仕事: 当初1ファイルだったカタログデータが289行で超過検出→薬/その他/共有型の3分割で解消(正当化登録には逃げず分割を選択)

自動テスト(型検査・lint・Vitest 769件・knip・build)通過を確認して完了。
**マイルストーン71完了(2026-07-18)。**

## マイルストーン72 — 巻物系アイテムの絵文字をカテゴリ単位に統一(2026-07-19)

不思議のダンジョン系の慣習(アイテム種別ごとに絵文字は固定、正体は取得時のテキストで判別する)に合わせ、巻物6種(テレポート・地図・識別・武器強化・防具強化・防具保護)がそれぞれ別の絵文字(🧭🔍⚡✨🔰など)を持っていたのを📜1種に統一。杖(🔮統一)・指輪(💍統一)・薬(💊統一)は元々カテゴリ単位で揃っており、巻物だけがこの規約から外れていた。

- [x] `src/game/glyphs.ts`: `ITEM_GLYPHS`の巻物6種を全て`📜`に変更。コメントを「カテゴリ単位で固定、識別要否とは無関係」という規約の説明に置き換え
- [x] `src/game/frame.test.ts`: 個別絵文字を検証していたテストを、巻物が全て同じ絵文字であることを検証するテストに置き換え
- [x] `docs/catalog.md`を`npm run docs:catalog`で再生成(SSOT生成元は`ITEM_GLYPHS`なので手編集不要)

自動テスト(Vitest 768件)・構造lint通過を確認して完了。杖=水晶玉(🔮)の意味的なズレ(「杖」自体を🔮に合う呼び名に変える案)は別マイルストーンとして再検討する。
**マイルストーン72完了(2026-07-19)。**

## マイルストーン73 — 絵文字選定基準をADR化し、杖🔮→🪄に差し替え(2026-07-19)

マイルストーン72で浮上した「杖=水晶玉(🔮)」の意味的ズレを解消。絵文字選定基準(`docs/emoji-policy.md`)のUnicodeバージョン上限が「6.0以前」という古い目安のままだったため、Windows Terminal/Segoe UI Emojiの実際の対応状況をリサーチし直した上で基準を更新し、その結果として🪄(マジックワンド)への差し替えが可能になった。

- [x] `docs/emoji-policy.md`: Unicodeバージョン上限を「6.0以前」→「15.1(Emoji 15.1)以下、16.0は保留」に更新。VS16回避(基準2)は独立に厳格維持と明記(Windows Terminal自体の未解決バグであることをリサーチで確認)。対象環境をWindows Terminal限定のまま維持する判断も含め、`## 決定の記録(ADR)`として根拠・ソースを記録
- [x] `src/game/glyphs.ts`: `striking-wand`/`slow-wand`の`ITEM_GLYPHS`を🔮→🪄に変更(単一コードポイント・VS16不要・Emoji 13.0で新基準の15.1以下に収まる)
- [x] `docs/catalog.md`を`npm run docs:catalog`で再生成
- [x] `README.md`: 巻物・杖の絵文字説明が旧絵文字(🧭🔍⚡✨🔰🔮)のまま古くなっていたのをマイルストーン72・73の内容に合わせて修正(72の時点で見落としていたドキュメント負債)

自動テスト(Vitest 768件)・構造lint通過を確認して完了。
**マイルストーン73完了(2026-07-19)。**

## マイルストーン74 — HP・状態異常チップに専用絵文字を割り当て(2026-07-19)

`statusBar.tsx`のHPと状態異常チップ(混乱・浮遊・盲目・麻痺・索敵)が文字ラベルのみだったのを、それぞれ専用絵文字に置き換え。マイルストーン73のUnicode 15.1ライン緩和で候補の幅が広がったのを受けての着手。

- HP: 💓(鼓動ハート)。milestone 68で候補だった❤️はVS16必須で却下されていたが、💓は単一コードポイントでVS16不要
- 混乱: 💫(漫画表現の定番。ZWJ結合絵文字の😵‍💫は基準1で除外)
- 浮遊: 🪽(Emoji 15.0、新基準の15.1以下に収まる)
- 盲目: 🙈("強制的に見えなくされる"という受動性の表現。能動的な「覗き見」を意味する🫣は却下。実在のアクセシビリティ絵文字🦯は技術基準は満たすが、当事者のための記号を一時的なコミカルデバフに転用する語調のミスマッチを理由に見送り)
- 麻痺: ⚡(マイルストーン72の巻物統一で空いた絵文字を再利用。ゲームにおける「麻痺=雷」という定番表現とも合致)
- 索敵: 🔭(直感的な👁️はVS16必須のため除外。📡はSF色が強すぎるため見送り)

- [x] `src/shell/statusBar.tsx`: `STATUS_CHIPS`に`glyph`フィールドを追加、チップ表示を文字ラベルから絵文字に変更。HP表示も💓に変更
- [x] `demo/main.js`: 同内容を追従(CLIとブラウザ版のDOM順・表示ロジックの対称性を保つ既存規律)

自動テスト(Vitest 768件)・構造lint通過を確認して完了。
**マイルストーン74完了(2026-07-19)。**

## マイルストーン75 — 盾(shield)を鎧(armor)に概念ごとリネーム(2026-07-19)

「盾なのに絵文字は🦺(安全ベスト)」という違和感を解消。🛡️(盾そのものの絵文字)はVS16必須で使えず、代替候補(🔰=初心者マーク等)も文化的に無理があると判明したため、絵文字を変えるのではなく**アイテムの概念自体を🦺に合わせてリネーム**する方針にした(最初期の議論で出ていた「絵文字に概念を寄せる」発想の実践)。

- ゲームの実際の効果(防御力+1の恒久強化、20%で呪い)は「盾で防ぐ」という能動的アクションを伴わない、単なる防御力ステータス強化。「鎧」の方が実態に合っている
- 内部の`ItemKind`識別子も`shield`→`armor`に変更(表示名だけでなく識別子も揃えないと、`enchant-armor`/`protect-armor`という既存の巻物(汎用語"armor"を使う側)との対応関係が読み取れなくなるため)。剣(`sword`)側は`enchant-weapon`が既に汎用語"weapon"を使っており具体名/汎用語の対応が保たれているのに対し、盾は`shield`(具体名)と`armor`(巻物側の汎用語)が対応しない歪な状態だった。`armor`に統一したことでこの歪みも解消
- 絵文字🦺自体は変更なし(技術的制約はそのまま)。表示名「盾」→「鎧」、`ItemKind`の値`"shield"`→`"armor"`、関連する定数(`SHIELD_*`→`ARMOR_*`)・関数(`applyUseShield`→`applyUseArmor`)を一括変更
- セーブ/リプレイのItemKindがシリアライズに含まれるため`SAVE_FORMAT_VERSION`を25→26、`REPLAY_FORMAT_VERSION`を2→3に bump

自動テスト(Vitest 768件)・typecheck・knip・構造lint通過を確認して完了。
**マイルストーン75完了(2026-07-19)。**

## マイルストーン76 — chromeの絵文字直後に半角スペースを徹底(2026-07-19)

マイルストーン74の実機テストプレイで、状態異常チップの🪽(浮遊)が直後の`(13)`にめり込んで見える不具合を発見。マップタイルは`TILE_W = 2`のグリッドで桁が確保されるが、chrome(ステータスバー)は`<Text>`内の素のテキスト連結で桁の保証が無いため、絵文字選定の4基準を満たしていても隙間なく後続文字が続くと実機で欠けて見えることがあると判明。

- [x] `statusBar.tsx`: `STATUS_CHIPS`の全チップと💰(唯一スペースが無かった箇所)に半角スペースを追加
- [x] `demo/main.js`: 同内容を追従
- [x] `docs/emoji-policy.md`: 「chromeの絵文字は直後に必ず半角スペースを1つ置く」を適用範囲節に追記(4基準とは別の実機由来の教訓として記録)

自動テスト(Vitest 768件)・構造lint通過を確認して完了。
**マイルストーン76完了(2026-07-19)。**

## マイルストーン77 — ブラウザデモのマップ/インベントリ排他表示が機能していなかったバグを修正(2026-07-19)

マイルストーン43で「demo/main.jsもCLIと同じ排他表示に」と記録されていたが、実際には機能していなかった。`main.js`側は`mapElement.hidden = isInventoryOpen`を正しくセットしていたが、`demo/style.css`の`.map { display: grid; ... }`(作者スタイルシート)が、ブラウザ標準の`[hidden] { display: none }`(ユーザーエージェントスタイルシート)を同格の詳細度でカスケード順位により上書きしてしまい、`hidden`属性が付いても見た目上マップが消えないままだった。Playwrightで実機確認するまで見た目からは気づけなかった(JSの状態は正しかったため)。

- [x] `demo/style.css`: `.map[hidden] { display: none; }`(`.map`単体より詳細度が高いセレクタ)を追加して修正
- [x] Playwright(msedgeチャンネル、`playwright-core`を`--no-save`で一時導入)で`i`キー押下後の`#map`の`computed display`が`none`になることを実機確認。スクリーンショットで見た目も確認

自動テスト(Vitest 768件)・構造lint通過を確認して完了。

**マイルストーン77完了(2026-07-19)。**

## マイルストーン78 — 状態異常チップの絵文字をCLI/ブラウザ間で共有(2026-07-19)

`statusBar.tsx`と`demo/main.js`の`STATUS_CHIPS`が同じ絵文字(💫🪽🙈⚡🔭)を手書きで2箇所に持っていて、新しい状態異常を足すたびに手作業同期に頼っていた(マイルストーン77のCSSバグ調査の流れで、独自実装のコストとして指摘)。コア(`GameState`/`advanceTurn`等)は元々共有できているので、絵文字だけ共有元に寄せる。

- [x] `src/game/glyphs.ts`: `CONFUSION_GLYPH`/`LEVITATION_GLYPH`/`BLINDNESS_GLYPH`/`PARALYSIS_GLYPH`/`DETECT_MONSTER_GLYPH`を新設。状態異常は`docs/tasks/game.md`のバックログにある通り`ItemKind`のような統一されたkindカタログを持たない設計なので、`Record<Kind, ...>`ではなく個別の名前付きexportにした(色・参照するstateフィールドは各シェル側に残るため、共有すべきは絵文字だけ)
- [x] `src/game/index.ts`: 上記5つを再エクスポート(ブラウザデモの唯一のimport元)
- [x] `statusBar.tsx`・`demo/main.js`: `STATUS_CHIPS`の絵文字リテラルを上記のimportに置き換え
- [x] Playwright実機確認: ブラウザ版が`dist/game/index.mjs`から5つの絵文字を正しく解決できることを確認

自動テスト(Vitest 768件)・typecheck・構造lint・build通過を確認して完了。
**マイルストーン78完了(2026-07-19)。**

## マイルストーン79 — ブラウザデモにセーブ/ロードを追加、CLI版のセーブ破損時にも警告を追加(2026-07-19)

`demo/main.js`冒頭コメントに元々あった「localStorage would be the drop-in point for save later」という伏線を実現。CLI版と同じ1スロット・消費型のセーブ形式(`src/game/format/saveFormat.ts`)をそのまま流用し、保存先だけ`fs`→`localStorage`に差し替えた。CLI版は`s`キーでの明示的セーブだが、ブラウザはタブがいつ閉じられるか分からないため毎ターン自動セーブにした(仕様の差はここだけで、フォーマット・消費セマンティクス・「プレイ中でなくなったら保存しない」という不正リプレイ防止の考え方は共通)。

あわせて、CLI版がセーブファイルの破損/バージョン不一致を黙って捨てていた(`loadSavedGameState`が`undefined`を返すだけで警告が無かった)点も、今回のブラウザ側の警告表示実装に合わせて改善した。

- [x] `src/game/format/saveFormat.ts`の`buildSaveFileContent`/`parseSaveFileContent`/`SaveFileError`型、`src/shell/systemMessages.ts`の`SAVE_LOAD_WARNING_MESSAGE`を`src/game/index.ts`から再エクスポート(ブラウザからも同じフォーマット・同じ文言を使うため)
- [x] `src/shell/saveFile.ts`: `loadSavedGameState`の戻り値を`GameState | undefined`から`LoadSaveOutcome`(`none`/`loaded`/`corrupted`の判別可能union)に変更。「セーブ無し」と「セーブはあったが読めなかった」を区別できるように
- [x] `src/main.tsx`: `SAVE_LOAD_WARNING_MESSAGE`をセーブ破損時に1回だけ表示(既存の全角入力警告と同じ表示ブロック・同じ「次の入力で消える」挙動)
- [x] `src/shell/session.ts`(新規): `main.tsx`にあった`Session`型・`createSession`・`recordAction`を分離。今回の変更でmain.tsxが200行の構造lint上限を超えたため、ファイル分割案を提示して人間裁可を得た上で実施(`.claude/rules/file-structure.md`の「AIは正当化を単独で書かない」規律通り)。副次効果として、これまでmain.tsxに埋もれてテストできなかった`recordAction`が`session.test.ts`で単体テスト可能になった
- [x] `demo/main.js`: `emoji-rogue-save`キーでlocalStorageに毎ターン自動セーブ(プレイ中のみ、死亡/勝利で即クリア)。起動時に読み込み・消費し、破損時は警告表示。`demo/index.html`/`style.css`に警告用の`#warning`要素を追加(DOM順はCLIに合わせログの後ろ)
- [x] `src/shell/saveFile.test.ts`: 新しい`LoadSaveOutcome`の形に合わせて期待値を更新
- [x] `src/shell/session.test.ts`(新規): `recordAction`の単体テスト(`createSession`は実ファイルパスに直接依存するため対象外、既存の`saveFile.test.ts`でカバー)
- [x] Playwright実機確認: 新規開始時は警告なし、1手進めるとlocalStorageに自動セーブされる、リロードでセーブを消費して再開する、seed表示が「再開したセーブデータ」になる、破損したlocalStorageからは警告を表示して新規開始する、次の入力で警告が消える、の5点を確認。CLI側はこの環境にtmux/PTYが無く対話実機確認は未実施(自動テストでのカバーのみ)

自動テスト(Vitest 772件)・typecheck・knip・構造lint・build通過を確認して完了。
**マイルストーン79完了(2026-07-19)。**

## マイルストーン80 — 持ち物のスタック廃止・スロット制容量上限と「使う/捨てる」動詞選択(2026-07-19)

バックログにあった「持ち物の容量上限」に着手。当初は既存の`{kind, quantity}`スタック方式(同種は数量で積み増し)を維持したまま種類数に上限を設ける実装で着手したが、本人から「スタック自体を無くしたい、2つ持てば2スロット占有する形にしたい」という訂正が入り、`GameState.inventory`を`readonly InventoryEntry[]`(`{kind, quantity}`の配列)から`readonly ItemKind[]`(1保持=1要素の配列)へ全面的に作り直した。同種を2個拾えば配列に同じkindが2要素並ぶ——上限20はその要素数(=真の意味でのスロット数)にかかる。上限値は本人裁可で不思議のダンジョンシリーズ随一の知名度を持つ『不思議のダンジョン 風来のシレン』初代のどうぐ袋基準値(20、後に巻物で40まで拡張可能——本作はまだ拡張非対応)を採用。既存の文字選択UI(a〜z、iを除く25文字)の上限とも矛盾しない値。`InventoryEntry`型はスタックが無くなったことで存在意義を失ったため削除。

あわせて本人からの追加依頼で、アイテムを選んだ後に「使う/捨てる」を選ぶ2段階UIと、「捨てる」(足元に置く)コマンドを実装。カーソルUIへの本格移行(バックログの「インベントリ/コマンドUXの拡充」テーマ)を待たず、既存の文字選択インフラの上に軽量な動詞サブメニューを乗せる形にした。

- [x] `src/game/balance.ts`: `INVENTORY_CAPACITY = 20`
- [x] `src/game/state.ts`: `InventoryEntry`型を削除、`GameState.inventory`を`readonly ItemKind[]`に変更(スタックが無いので容量=配列長がそのままスロット占有数)。`Action`に`drop-item`を追加
- [x] `src/game/items/inventory.ts`: `addToInventory`は常に末尾へ1要素追加(同種でも新しいスロットを消費)。`removeFromInventory`は該当kindの最初の1要素を`indexOf`で探して削除。`removeOneFromInventory`(nymphの盗み用、index指定削除)はそのまま流用
- [x] `src/game/items/pickups.ts`: `applyItemPickup`は`inventory.length >= INVENTORY_CAPACITY`なら(kindを問わず)拒否して`inventory-full`イベントのみ発火。スタック廃止により「既に持っている種類だけ上限を無視できる」という旧ロジックの分岐が丸ごと不要になり単純化
- [x] `src/game/items/use.ts`・`drop.ts`: 保持チェックを`inventory.find((entry) => entry.kind === kind)`から`inventory.includes(kind)`に簡略化
- [x] `src/game/enemies.ts`: nymphの盗みロジックを`entry.kind`から配列要素(ItemKind直値)参照に変更
- [x] `src/game/inventoryKeymap.ts`: `toSelectedItemKind`・`toItemVerbAction`の引数型を`readonly InventoryEntry[]`から`readonly ItemKind[]`に更新
- [x] `src/game/events.ts`: `inventory-full`・`item-dropped`イベントを追加、`src/game/format/validateGameState.ts`のペイロード検証テーブルにも追加。`isInventoryArray`(`{kind,quantity}`検証)を削除し、既存の`isItemKindArray`(元は`identifiedPotionKinds`用)を`inventory`にも流用——形が同じになったため
- [x] `src/game/format/saveFormat.ts`: セーブ形式の`inventory`の型が変わるため`SAVE_FORMAT_VERSION`を26→27にbump(旧セーブは非対応版として扱われ新規開始になる)
- [x] `src/game/advanceTurn.ts`: `use-item`/`drop-item`の共通フローを`applyItemAction`ヘルパーに集約(重複除去。200行制限ちょうどに収める副次効果もあり)
- [x] `src/shell/messages.ts`: `formatInventoryEntry`(スタック表示`x2`用)を削除——1行1保持になったので`resolveItemDisplayName`を直接使えば足りる。`formatInventoryTitle`(タイトルに`保持数/上限`を付加)を追加。`formatEvent`に`inventory-full`・`item-dropped`を追加
- [x] `src/shell/systemMessages.ts`: `ITEM_VERB_PROMPT`(「u: つかう  d: すてる (Escで戻る)」)を追加
- [x] `src/shell/inventoryOverlay.tsx`・`src/main.tsx`: `selectedItemKind`(シェル側の表示状態、GameStateには入れない)を追加。オーバーレイは選択前=行一覧(1保持1行、同種は同じ表示が複数行並ぶ)、選択後=選択中アイテム名+動詞プロンプトの2表示を切り替え。行のReactキーは同種重複がありうるため`entry.kind`から配列indexに変更(biome-ignoreコメント付き)
- [x] `demo/main.js`: 同じ2段階状態機械をミラー。`src/game/index.ts`から`formatInventoryTitle`・`ITEM_VERB_PROMPT`・`resolveItemDisplayName`・`toSelectedItemKind`・`toItemVerbAction`を新規再エクスポート、`formatInventoryEntry`は削除に伴い re-export からも撤去
- [x] テスト: `inventory.test.ts`(スタックなしの追加/削除/index指定削除に全面書き換え)・`pickups.test.ts`(容量到達時は既保持kindでも拒否するテストに訂正)・`drop.test.ts`・`use.test.ts`・`advanceTurn.test.ts`・`enemies.test.ts`(nymphの「複数スタック分割吸収」テストを「同種複数スロットのうち1つを盗む」テストに書き換え)・`teleport.test.ts`・`potions.test.ts`/`scrolls.test.ts`/`equipment.test.ts`/`wands.test.ts`/`rings.test.ts`/`food.test.ts`(`{kind,quantity:2}`形式の「スタック2→1」テストを「同kind2要素→1要素」に機械変換)・`inventoryKeymap.test.ts`・`messages.test.ts`(`formatInventoryEntry`のdescribeブロックを削除)・`inventoryOverlay.test.tsx`・`validateGameState.test.ts`(`quantity`絡みの十数箇所を配列直値に書き換え、`quantity:0`拒否テストは概念ごと消滅のため削除)を更新
- [x] 自動テスト(Vitest 787件)・typecheck・lint(構造lint含む)・knip・build、すべて通過
- [x] 実機スモークテスト: この環境にはtmux/PTYもPlaywright用ブラウザも無く、CLI(Ink TUI)・ブラウザデモとも対話的な実機確認は未実施(マイルストーン79のCLI側と同じ制約)。代わりに`inventoryOverlay.test.tsx`でのink実描画確認と、ビルド後の`dist/game/index.mjs`をNodeから直接importしての新規export・戻り値確認で代替。次回実機確認時に、同種複数保持時の行表示・容量超過時の拾えない挙動・使う/捨て2段階UIの見た目をWindows Terminal/ブラウザで確認すること

**マイルストーン80完了(2026-07-19)。**

## マイルストーン81 — 装備概念の導入(着脱可能な剣・防具・指輪、個体強化)

剣・防具・指輪が「使うと消費されキャラ全体に恒久加算される」方式だったのを、本物の**着脱可能な装備**に作り替える。発端は「装備という概念を避けたのはルール(関数型・状態最小化)の間接的な影響では」という指摘(2026-07-19の会話)。結論としてルールは装備を禁じていないが、リデューサで扱いやすい「変化しない値」への実装上のバイアスが実際に働いていたと判断し、着手した。

設計判断(会話で決定、詳細は本エントリの各チェック項目に反映):

- **スロット構成**: 武器1・防具1・指輪1。装備専用の別スロットは持たず、**持ち物の各エントリ自体が装備状態を持つ**(装備してもインベントリ容量を占有し続ける)
- **個体差**: 「シンプルタイプでまず進める」の想定だったが、既存の強化の巻物2種・防具保護の巻物がキャラ全体への恒久バフだったため、着脱を許すと矛盾する(持ち替えると強化が消える)ことが判明。**強化値・防錆フラグ・呪いはアイテム個体に紐づく永続状態**に落ち着いた(「錆びない鎧+99」が成立する形)
- **ダメージ/防御の分離**(不思議のダンジョンシリーズの「ちから」概念に倣う): `playerAttackDamage`を`playerPower`(怪力の薬のみが上げる恒久キャラ値、素手でも意味を持つ)に改名し、実際の攻撃力は`playerPower + 装備中の剣.attackBonus(無ければ0)`で導出。防御力は装備中の防具の`defenseBonus`のみ(素の防御力は0)。武器強化の巻物は「今装備中」ではなく「持ち物内の好きな剣」に対象を指定してかけられる(対象選択の仕様は下記)
- **呪いの再定義**: 数値ペナルティを廃止し、**着脱防止のみ**の効果にする。判定は拾った瞬間(spawn時)に1回だけ行い隠しておき、装備した時に判明する(装備のたびに再抽選しない)。指輪にも呪いを新規導入(現行は指輪に呪い自体が無い)
- **錆**: 現行の`armorProtected`(キャラ全体の恒久フラグ)は廃止し、**装備中の防具自身が持つ`rustProtected`**に。アクアターの錆攻撃は装備中防具の`defenseBonus`を直接削る(0未満にはならない)
- **解呪の巻物(新規アイテム)**: 装備中で呪われているものを一括で全て解呪する(不思議のダンジョン準拠)。持ち物内の未装備・未鑑定の呪いには触れない
- **対象選択UI**: カーソル方式への全面移行(バックログ記載の別件)は今回は見送り、**既存のレター選択(a〜z)の仕組みをもう1段重ねる**形にする。「使う」を選んだ時点でそのkindが対象指定を要る(武器強化・防具強化・防具保護)場合のみ、対象候補(該当kindの持ち物)だけに絞った行一覧をレターで選ばせてから発行する。解呪の巻物は一括処理なので対象選択を経由しない。shell state(GameStateには入れない)は「選んだアイテム」に加えて「選んだアイテムの対象」がこの3kindの時だけ発生する2段構成
- **アイテムの指定方式(2026-07-19、実装中に方針転換)**: 当初`use-item`に「対象のインベントリindex」を持たせる案だったが、バックログの既存決定「`Action`はkindベース維持(スロットindex参照はリプレイが並び順に依存して脆くなる)」と衝突すると判明。同kind内で個体差が生まれる以上kindだけでは対象を一意に特定できないため、**拾った時点で恒久的な`itemId`(連番、`GameState.nextItemId`で採番)を振り、`use-item`/`drop-item`はkindではなく`itemId`で対象を指定する**方式に統一した。indexより一段ロバスト(配列上の位置に依存しない)なため、バックログの懸念にもより強く応える

### 実装チェックリスト

**ゲーム層コア(コミット1想定)**
- [x] `src/game/state.ts`: `HeldItem`型を新設(全メンバー共通の`itemId`+ 剣/防具/指輪は`equipped`・`cursed`・`attackBonus`or`defenseBonus`(+`rustProtected`)を持つ判別可能union、それ以外の消費アイテムは`kind`のみ)。`GameState.inventory`を`readonly HeldItem[]`に変更、`nextItemId`を新設。`playerAttackDamage`→`playerPower`に改名、`playerDefense`・`hasRingOfRegeneration`・`hasRingOfSustenance`・`armorProtected`を削除。`Action`の`use-item`/`drop-item`を`kind`ではなく`itemId`(+`targetItemId`)指定に変更
- [x] `src/game/balance.ts`: `RING_CURSE_CHANCE_PERCENT`・`REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT`新設。`MIN_PLAYER_ATTACK_DAMAGE`(呪いの数値ペナルティ廃止で不要化)を削除
- [x] `src/game/events.ts`: `ItemKind`に`"remove-curse-scroll"`追加、`EquipmentItemKind`(sword/armor/regeneration-ring/sustenance-ring)を新設。`item-unequipped`・`equip-blocked-cursed`・`curse-revealed`・`items-decursed`の`GameEvent`を追加(`weapon-equipped`等の既存イベントは装備側で流用)
- [x] `src/game/items/equipment.ts`: 剣・防具の「使う」を消費でなく装備トグルに書き替え。呪いが立っていれば解除不可でno-op。実際の攻撃力/防御力を導出する純粋関数(`calculatePlayerAttackDamage`/`calculatePlayerDefense`)をここに置く
- [x] `src/game/items/rings.ts`: 指輪も装備トグル化、呪い導入。`turnEnd/regeneration.ts`・`turnEnd/hunger.ts`の判定を「装備中の指輪」ベースに変更
- [x] `src/game/items/pickups.ts`: 剣・防具・指輪を拾った時点で呪い判定(隠し)と初期`attackBonus`/`defenseBonus`(`SWORD_ATTACK_BONUS`/`ARMOR_DEFENSE_BONUS`)を確定
- [x] `src/game/items/inventory.ts`・`drop.ts`・`use.ts`: `HeldItem`前提に書き替え。`use-item`は剣/防具/指輪なら装備トグル、それ以外は従来通り消費
- [x] `src/game/combat.ts`: `state.playerAttackDamage`直読みを`calculatePlayerAttackDamage(state)`呼び出しに変更
- [x] `src/game/enemies.ts`: アクアターの錆処理を装備中防具の`defenseBonus`減算に変更(`rustProtected`または防具未装備ならスキップ)。nymphの盗みロジックを`HeldItem`対応にし、**装備中のアイテムは盗みの対象から除外**する仕様を追加(不思議のダンジョン準拠、実装中の判断)
- [x] `src/game/initialState.ts`: `INITIAL_RUN_STATE`を新フィールドに合わせて更新
- [x] `src/game/format/saveFormat.ts`・`validateGameState.ts`・`validateReplay.ts`・`replayFormat.ts`: `HeldItem`のシリアライズ・検証に対応、`SAVE_FORMAT_VERSION`を28、`REPLAY_FORMAT_VERSION`を4にbump(`drop-item`のreplay検証が実は存在しなかった既存バグも合わせて修正)
- [x] 上記変更に追従する既存テスト一式の更新(`items/*.test.ts`・`combat.test.ts`・`enemies.test.ts`・`format/*.test.ts`・`advanceTurn.test.ts`ほか。並行するバックグラウンドAgent2体+本セッションで分担)

**巻物と対象選択**
- [x] `src/game/items/scrolls.ts`: 武器強化・防具強化・防具保護の巻物を「`targetItemId`必須、対象は該当kindなら未装備でも可」に書き替え。解呪の巻物(新規)を追加、装備中の呪われた`HeldItem`を全て`cursed: false`にする
- [x] `src/game/state.ts`の`Action`: `use-item`/`drop-item`を`kind`ではなく`itemId`(+`targetItemId`)指定に変更(設計転換の経緯は上記参照)
- [x] `src/game/balance.ts`: `REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT`等の出現率定数を追加。`src/game/floor/items.ts`のスポーンテーブルに追加(末尾に追加し既存シードのrng消費順を保存)
- [x] `src/game/glyphs.ts`: `remove-curse-scroll`に📜(巻物共通)を割り当て
- [x] `src/shell/gameNames.ts`・`itemCatalog.ts`・`catalogData.ts`: 表示名・図鑑データに新アイテムを追加、`npm run docs:catalog`で`docs/catalog.md`再生成
- [x] 対応テスト追加・更新

**シェル/UI**
- [x] `src/game/inventoryKeymap.ts`: `toSelectedItemKind`を`toSelectedHeldItem`に置き換え、`resolveTargetKind`(対象が要るkind→対象kind)・`toTargetedUseAction`を新設
- [x] `src/main.tsx`: 肥大化(200行超)したため、持ち物オーバーレイの状態機械(選んだアイテム/対象)を`src/shell/inventoryInteraction.ts`(`useInventoryInteraction`フック)に分離。main.tsxはこのフックを呼ぶだけに縮小(マイルストーン79のsession.ts分離と同じ理由)
- [x] `src/shell/inventoryOverlay.tsx`: 装備中の行に区別表示(強化値・装備中・呪いのタグ)、対象選択フェーズの行一覧表示を追加
- [x] `src/shell/messages.ts`・`systemMessages.ts`: 新イベント・新プロンプト文言の追加。`messages.ts`も200行超のため、持ち物行表示系(`formatHeldItemLabel`・`formatInventoryTitle`)を`src/shell/inventoryLabels.ts`に分離
- [x] `demo/main.js`: 同内容をミラー
- [ ] 実機スモークテスト: この環境にはtmux/PTYもPlaywright用ブラウザも無く、対話的な実機確認は未実施(マイルストーン79・80と同じ制約)。自動テスト(Vitest・ink実描画テスト)でのカバーのみ。次回実機確認時に、装備/解除/呪いロック/対象選択/解呪の一連の流れをWindows Terminal/ブラウザで確認すること

**構造lint対応(実装中に発生)**
- [x] `src/game/state.ts`(232行)・`src/game/advanceTurn.ts`(203行): いずれも「ゲームの全語彙/リデューサ本体を1箇所で読める価値」を理由に、本人裁可を得て`file-size-exception`コメントで容認
- [x] `src/shell/messages.ts`(213行): 本人裁可を得て`formatHeldItemLabel`/`formatInventoryTitle`を`src/shell/inventoryLabels.ts`に分割

自動テスト(Vitest 806件)・typecheck・lint(構造lint含む)・knip・buildの通過を確認して完了。

**追記(同日、完了後のUX調整)**: 装備品の「使う」表記が実態と合っていない指摘を受け、`u`の表示を対象に応じて動的に変更(消費アイテムは「つかう」のまま、未装備の剣/防具/指輪は「装備する」、装備中は「はずす」— `src/shell/inventoryLabels.ts`の`resolveItemVerbPrompt`)。あわせて持ち物一覧の「装備中」テキストを絵文字✅に置き換え(`EQUIPPED_GLYPH`、`src/game/glyphs.ts`)。Vitest 810件・typecheck・lint・knip・build再確認済み。

**追記2(同日、バグ修正)**: 上記の作業中に発覚 — 呪われた装備は「外す」操作(`u`)だけを拒否する実装で、「捨てる」(`d`)は呪い状態を一切見ておらず、装備中の呪われたアイテムをそのまま捨てられる抜け道になっていた。`src/game/items/drop.ts`の`applyItemDrop`に「装備中かつ呪われているアイテムは`equip-blocked-cursed`をログして拒否」のチェックを追加して解消。Vitest 813件・typecheck・lint・knip・build再確認済み。

**追記3(同日、バグ修正 → 本人指摘で設計を上流に是正)**: 本人のプレイで発覚 — 指輪を装備して床に捨て、拾い直したら別の呪いが発生した。原因は床の`Item`型が`{x,y,kind}`しか持たず、`HeldItem`が持つ個体状態(itemId・呪い・強化値)を捨てた瞬間に消失させていたため、拾い直すたびに`applyItemPickup`が完全に新規の個体として呪い・強化値を再抽選していた。

当初は`Item`型に`identity`(任意フィールド)を追加し、`applyItemDrop`が装備の個体状態を床に持たせ、`applyItemPickup`が`identity`があれば復元・無ければ拾得時に新規抽選、という対症療法で修正した。しかし本人から「そもそも呪い判定はマップ配置(生成)時にすべきでは」という指摘があり、根本原因(**呪い・強化値の確定タイミングが拾得時になっていたこと自体**)まで遡って設計を是正:

- 剣・防具・指輪の`identity`(itemId・呪い・強化値)は**フロア生成時**(`src/game/floor/items.ts`の`drawFloorItems`)に確定するよう変更。`Item`型の`identity`は(消費アイテム以外は)必須フィールドに変更 — 「拾うまで個体が存在しない」という不自然な遅延評価が型レベルでも無くなった
- `nextItemId`を`rng`と同じようにフロア生成の呼び出し連鎖(`floor/layout.ts`→`floor/transitions.ts`/`initialState.ts`)に通す形に変更
- `applyItemPickup`は「床のidentityをそのまま持ち物にコピーする」だけの単純な処理になり、剣・防具・指輪の拾得は乱数を一切消費しなくなった(消費アイテムのitemId発行のみ拾得時に残る)
- `src/game/items/heldItemFactory.ts`: `buildHeldItem`/`restoreHeldItem`の二重経路を`buildFloorItem`(生成時、`Rng`を直接消費)+`toHeldItem`(拾得時、純粋)の1本に整理
- `SAVE_FORMAT_VERSION`を29にbump(据え置き — `identity`必須化も同じ29の範囲内の変更として扱う)

Vitest 823件・typecheck・lint・knip・build再確認済み。

**マイルストーン81完了(2026-07-19)。**

## マイルストーン82 — 構造lintに「逆方向」の監査hintを追加(軸の切り直し・集約の検知、2026-07-19)

コード変更ではなく開発フローの拡張。既存の構造lint(`scripts/check-structure.mjs`)は肥大化→分割の一方向にしか反応しないという議論から、反対方向(軸の切り直し・過剰分割の集約)を検知する仕組みを追加した。

- `scripts/check-structure.mjs`: 第3チェックとして、`scripts/structure-audit-state.json`に記録した最終監査コミットからの`src/`差分規模(ファイル数/行数、いずれかが`DRIFT_HINT_FILES`/`DRIFT_HINT_LINES`超過)に応じてhintのみを出す仕組みを追加。既存2チェックと違い**errorには昇格しない**(軸の誤りの判断は常に人間主導であるべきため)
- `scripts/structure-audit-state.json`(新規): 最終監査コミットハッシュ・日付を記録。更新は`structure-audit`スキル完了時のみ
- `.claude/skills/structure-audit/`(新規): hint発火時または依頼時に、co-change(`git log --name-only`)・責務重複を読んで再編成案を人間に提案し、裁可後にのみ適用するスキル
- `.claude/rules/file-structure.md`・`docs/architecture.md`: 上記を反映

idea側の議論・経緯は`idea`リポジトリ`ideas/ai-program-skill-rules-sedimentation.md`の追記節を参照。

自動テスト(Vitest 823件)・typecheck・lint(構造lint含む)通過を確認して完了。

**マイルストーン82完了(2026-07-19)。**

## マイルストーン83 — オーク(撃破時に追加の金貨をドロップする、頑丈な近接アタッカー)

`/goal`による自律開発が別ブランチ(`claude/tengu-class-classification-kgjioa`)で敵5種・杖3種・指輪3種・巻物2種・わな2種・状態異常1種(マイルストーン64〜79相当)を実装していたが、developへ一度もマージされないまま残っていた(発見・整理は2026-07-20)。developはその間に独自にマイルストーン64〜82(絵文字ADR化・装備システム導入・持ち物スロット制・`items`/`floor`/`format`/`turnEnd`へのフォルダ再編など)を進めており、両者は番号だけでなくファイル配置・アイテムモデルまで食い違っていたため、単純なmerge/rebase/cherry-pickではなく、該当ブランチの設計ログ(値・イベント形・エッジケース)を仕様として読み、現行developのアーキテクチャに合わせて再実装する方針にした(番号は83から振り直し)。

本マイルストーンはその第1弾。原作Rogueのオーク(Orc)に着想を得た敵を追加する。ゾンビ・コウモリより頑丈(HP・攻撃力とも高め)でまっすぐ殴り合う近接アタッカーだが、原作のオークが金への執着で知られる特徴を、「撃破すると金貨と同じ乱数範囲(`GOLD_AMOUNT_MIN`〜`GOLD_AMOUNT_MAX`)でボーナス金貨をその場でドロップし、自動的に`goldCollected`へ加算する」という形で簡略再現する(個体に金貨を持たせて床に落とすのではなく、撃破の瞬間に直接加算する——`GoldPile`エンティティを経由しない、既存の`gold-collected`とは独立した専用イベント)。深さスケーリングはせず、盗賊・ニンフ・アクエーターと同じ独立per-floor抽選とする。`advanceEnemies`側の行動原理はゾンビ・コウモリと同一(隣接すれば通常攻撃、それ以外はA*追跡/徘徊)のため`enemies.ts`への変更は不要——変更が要るのは撃破処理を担う`combat.ts`の`applyEnemyHit`だけで、プレイヤーの近接攻撃・杖のどちらで倒しても同じくドロップする。

- [x] `src/game/events.ts`: `ENEMY_KIND_VALUES`に`"orc"`を追加。`GameEvent`に`orc-gold-drop`(payload: 実ドロップ量`amount`)を追加
- [x] `src/game/balance.ts`: `ORC_MAX_HP = 4`・`ORC_ATTACK_DAMAGE = 2`・`ORC_ACTIONS_PER_TURN = 1`・`ORC_SPAWN_CHANCE_PERCENT = 20`を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`/`ENEMY_EXPERIENCE_REWARD`に`orc`のエントリを追加(経験値はアクエーターと同格の3)
- [x] `src/game/combat.ts`: `applyEnemyHit`が撃破時に`target.kind === "orc"`なら`state.rng`を一時的にステートフルな`Rng`に起こし(`teleport.ts`の`applyRandomTeleport`と同じ既存パターン)ボーナス額を抽選、`goldCollected`に加算し`orc-gold-drop`を記録
- [x] `src/game/floor/enemies.ts`: `ENEMY_SPAWN_TABLE`の末尾に追加(配列順=rng消費順の規約どおり) + テスト(`floor/enemies.test.ts`のkindループにorcを追加)
- [x] `src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/catalogData.ts`: `ENEMY_GLYPHS`/`ENEMY_NAMES`/`ENEMY_CATALOG`にエントリを追加(`ENEMY_CATALOG`は`Record<EnemyKind, ...>`の網羅型のため追加漏れはコンパイルエラーになる)
- [x] `src/shell/messages.ts`: `orc-gold-drop`の文言(「オークが金貨を落とした!◯ゴールド手に入れた」) + テスト
- [x] `src/game/format/validateGameState.ts`: `orc-gold-drop`イベントの検証ケース(`amount`が正の整数)を追加。`EnemyKind`列挙値追加のみのためセーブ形式の構造変更なし(`SAVE_FORMAT_VERSION`据え置き)
- [x] `src/game/combat.test.ts`: 近接・杖どちらの撃破でもドロップすること、決定性、非オークの撃破ではドロップしないこと、非致死ヒットではドロップしないことを確認
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、`advanceTurn`のバンプ攻撃でオークを撃破すると`goldCollected`が増え`orc-gold-drop`イベントが記録されること、同条件のゾンビ撃破では変化しないことを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 829件・knip・build)が通過し、上記パイプライン確認が済んだところで完了とする。`npm run docs:catalog`で`docs/catalog.md`にオークの行を追加した。

**マイルストーン83完了(2026-07-20)。**

## マイルストーン84 — ドラゴン(希少な最強格の近接アタッカー)

未反映ブランチの内容の再実装、第2弾(方針はマイルストーン83を参照)。原作Rogueのドラゴン(Dragon)に着想を得た、既存のどの敵よりも頑丈で攻撃力も高い、ボス格の近接アタッカーを追加する。特殊能力は持たせない——ゾンビ・コウモリ・オークが`ENEMY_ACTIONS_PER_TURN`等のテーブルの数値差だけで、`advanceEnemies`に専用分岐を持たないのと同じ「パラメータだけで差別化する」パターンをドラゴンにも踏襲する。深さスケーリングはせず盗賊・ニンフ・アクエーター・オークと同じ独立per-floor抽選だが、出現率は指輪・杖と同等の低頻度(希少)にする。

- [x] `src/game/events.ts`: `ENEMY_KIND_VALUES`に`"dragon"`を追加(新規`GameEvent`は不要——既存の`enemy-hit`/`enemy-defeated`/`sneak-attack`/`wand-struck`/`player-hit`/`player-died`がすべて`EnemyKind`をpayloadに持つ汎用イベントなのでそのまま横展開される)
- [x] `src/game/balance.ts`: `DRAGON_MAX_HP = 8`・`DRAGON_ATTACK_DAMAGE = 4`・`DRAGON_ACTIONS_PER_TURN = 1`・`DRAGON_SPAWN_CHANCE_PERCENT = 8`(希少)を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`/`ENEMY_EXPERIENCE_REWARD`に`dragon`のエントリを追加(経験値6、アクエーターの3を上回る)
- [x] `src/game/floor/enemies.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/catalogData.ts`: 他の独立per-floor抽選kindと同じ形で追加
- [x] `src/game/format/validateGameState.ts`: 変更不要(`isEnemyKind`は`ENEMY_KIND_VALUES`から自動導出)。列挙値追加のみのためセーブ形式の構造変更なし
- [x] `src/game/format/validateGameState.test.ts`: 「存在しない敵種」の無効値プレースホルダとして`"dragon"`を使っていた4箇所(enemies配列・enemy-slowed・wand-struck・sneak-attackの各イベント検証)が、`"dragon"`の実装により意図せず正当な値になり偽陽性で落ちるところだった——元ブランチのマイルストーン65が同じ理由で踏んだ落とし穴と同一なので、同じ対処(未実装のまま残る原作Rogueモンスター`"griffin"`に差し替え)を先回りして適用した
- [x] `src/game/combat.test.ts`・`src/game/floor/enemies.test.ts`: 経験値がアクエーターより高いこと、スポーンテーブルへの参加を確認
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、ドラゴンを`advanceTurn`のバンプ攻撃で撃破でき、経験値6(アクエーター撃破の3を上回る)が入ることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 830件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン84完了(2026-07-20)。**

## マイルストーン85 — テレポートの杖(3種類目の杖、敵を強制テレポートさせる)

未反映ブランチの内容の再実装、第3弾(方針はマイルストーン83を参照)。原作Rogueの"wand of teleportation"に着想を得た、命中の杖・鈍足の杖に続く3種類目の杖。効果は視界内最近接の敵(既存の`findNearestVisibleEnemy`をそのまま再利用)をフロア内のランダムな床マスへ強制的にテレポートさせる——プレイヤー自身のテレポート(巻物・わな)で確立済みの移動先選定ロジック(`teleport.ts`の`collectTeleportTargets`、自分の座標・他の敵の座標を除外)をそのまま流用し、対象を敵に差し替えるだけの新規`applyEnemyTeleport`を追加する。対象は移動後に必ず覚醒する。視界内に敵がいなければ他の杖と同じ無効果(ターン消費なし・杖も消費しない)。既存の🔮・「杖」をそのまま共有する。

- [x] `src/game/events.ts`: `ItemKind`に`"teleport-wand"`を追加。`GameEvent`に`enemy-teleported`(payload: `target: EnemyKind`)を追加
- [x] `src/game/balance.ts`: `TELEPORT_WAND_SPAWN_CHANCE_PERCENT = 8`(他の杖と同じ希少度)を追加
- [x] `src/game/teleport.ts`: 新規`applyEnemyTeleport(state, target)`——`collectTeleportTargets`(既存)から乱数で1マス選び対象を移動、`awake: true`にし`enemy-teleported`を記録
- [x] `src/game/items/wands.ts`: `applyUseTeleportWand(state)`——`findNearestVisibleEnemy`で対象を選び、無効果パターンは他の杖と同一
- [x] `src/game/items/use.ts`: `applyItemEffect`に`case "teleport-wand"`を追加(網羅switchのため追加漏れはコンパイルエラーになる)
- [x] `src/game/floor/items.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/itemCatalog.ts`: 他の杖と同じ形で追加
- [x] `src/shell/messages.ts`: `enemy-teleported`の文言(「杖の力で◯をどこかへ飛ばした!」)
- [x] `src/game/format/validateGameState.ts`: `enemy-teleported`イベントの検証ケースを追加。`ItemKind`列挙値追加のみのためセーブ形式の構造変更なし
- [x] `src/game/teleport.test.ts`・`src/game/items/wands.test.ts`(のかわりに`teleport.test.ts`側にwand越しの結合テストを追加)・`src/game/floor/items.test.ts`・`src/shell/messages.test.ts`・`format/validateGameState.test.ts`: 各パターンのテストを追加
- [x] `src/game/floor/items.ts`が201行に達し行数ゲート(200行)に抵触したため、わな抽選ロジック(ダーツ確定湧き+落とし穴/テレポートの確率抽選)を新規`src/game/floor/traps.ts`の`drawFloorTraps`に切り出した(rng消費順は既存コードをそのまま移動しただけなので不変)。対応するテストも`floor/traps.test.ts`へ移設した
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、視界内の敵にテレポートの杖を使うと座標が変わり覚醒し`enemy-teleported`イベントが記録されること、視界内に敵がいなければ無効果であることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 836件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン85完了(2026-07-20)。**

## マイルストーン86 — 隠密の指輪(3種類目の指輪、敵の目覚め確率を下げる)

未反映ブランチの内容の再実装、第4弾(方針はマイルストーン83を参照)。原作Rogueの"ring of stealth"に着想を得た、再生の指輪・満腹の指輪に続く3種類目の指輪。効果は`advanceEnemies`の`WAKE_CHANCE_PERCENT`毎ターン判定を、装備中は`STEALTH_RING_WAKE_CHANCE_PERCENT`(約半分)に差し替えるだけ。

元ブランチはこの効果を`GameState.hasRingOfStealth`という恒久フラグで実装していたが、現行developの指輪は装備システム(マイルストーン81)導入後、`inventory`内の`HeldItem`の`equipped`を`hasEquippedRing(inventory, kind)`で都度読む方式に変わっており、恒久フラグという概念自体が存在しない——効果側の実装は「読み出し箇所(`enemies.ts`の目覚め判定)で`hasEquippedRing`を呼ぶだけ」に単純化された。新規`GameState`フィールドが不要なため、元ブランチでは必要だった`SAVE_FORMAT_VERSION`の更新も不要。

- [x] `src/game/events.ts`: `ItemKind`に`"stealth-ring"`を追加し`EQUIPMENT_ITEM_KIND_VALUES`にも追加(新規`GameEvent`は不要——既存の`ring-equipped`をそのまま再利用)
- [x] `src/game/state.ts`: `HeldItem`・`Item`の指輪バリアントのkind unionに`"stealth-ring"`を追加(`RingIdentity`は既存の`{itemId, cursed}`のまま、追加フィールド不要)
- [x] `src/game/balance.ts`: `STEALTH_RING_SPAWN_CHANCE_PERCENT = 8`・`STEALTH_RING_WAKE_CHANCE_PERCENT = 15`(`WAKE_CHANCE_PERCENT`(33)の約半分)を追加
- [x] `src/game/items/rings.ts`: `RingItem`型・`RING_KINDS`・`hasEquippedRing`の対象kindを3種に拡張(`applyToggleRingEquip`自体はkind非依存のため無改造)
- [x] `src/game/items/heldItemFactory.ts`・`src/game/items/drop.ts`・`src/game/format/validateGameState.ts`: 指輪3種を扱う各switchに`"stealth-ring"`のcaseを追加(いずれも`identity`の組み立てが既存2種と同一パターン)
- [x] `src/game/items/use.ts`: `applyItemEffect`の指輪ケースに`"stealth-ring"`を追加
- [x] `src/game/enemies.ts`: `advanceEnemies`の目覚め判定で`hasEquippedRing(inventory, "stealth-ring") ? STEALTH_RING_WAKE_CHANCE_PERCENT : WAKE_CHANCE_PERCENT`を参照するよう変更(kind別分岐ではなく状態依存の数値差し替えのみ)
- [x] `src/game/floor/items.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/itemCatalog.ts`: 他の指輪と同じ形で追加
- [x] `src/shell/messages.ts`: `ring-equipped`の2値ternaryを3分岐if-chainに変更(`functional-style.md`の許容上限どおり——4種類目(マイルストーン87)でルックアップテーブルへの切り替えが必要になる見込み)
- [x] `src/game/items/rings.test.ts`・`src/game/enemies.test.ts`・`src/game/floor/items.test.ts`・`src/shell/messages.test.ts`: 各パターンのテストを追加。`enemies.test.ts`には特定seedに頼らない構造的性質のテスト(「同じ乱数列に対し隠密の指輪の閾値のほうが目覚めにくい、またはタイ」を200 seed分検証)を追加
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、隠密の指輪を装備すると`equipped`が立ち`ring-equipped`イベントが記録されることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 838件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン86完了(2026-07-20)。**

## マイルストーン87 — 千里眼の指輪(4種類目の指輪、敵の位置を常時察知する)

未反映ブランチの内容の再実装、第5弾(方針はマイルストーン83を参照)。索敵の薬(一定ターンだけ敵の位置を視界外・未探索領域含めて可視化する)の恒久版を、再生・満腹・隠密に続く4種類目の指輪として追加する。`frame.ts`の敵描画条件は既に`state.detectMonstersTurnsRemaining > 0`という状態依存の条件分岐になっているため、`|| hasEquippedRing(state.inventory, "awareness-ring")`を足すだけで実現できる。

- [x] `src/game/events.ts`: `ItemKind`/`EQUIPMENT_ITEM_KIND_VALUES`に`"awareness-ring"`を追加(新規`GameEvent`は不要——既存の`ring-equipped`をそのまま再利用)
- [x] `src/game/state.ts`: 指輪バリアントのkind unionに`"awareness-ring"`を追加(4種目)
- [x] `src/game/balance.ts`: `AWARENESS_RING_SPAWN_CHANCE_PERCENT = 8`を追加
- [x] `src/game/items/rings.ts`・`src/game/items/heldItemFactory.ts`・`src/game/items/drop.ts`・`src/game/items/use.ts`・`src/game/format/validateGameState.ts`: 指輪4種を扱う各所に`"awareness-ring"`のcase/型を追加(マイルストーン86で確立したパターンの横展開)
- [x] `src/game/frame.ts`: 敵描画条件を`state.detectMonstersTurnsRemaining > 0 || hasEquippedRing(state.inventory, "awareness-ring")`に変更
- [x] `src/game/floor/items.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/itemCatalog.ts`: 他の指輪と同じ形で追加
- [x] `src/shell/messages.ts`・`src/shell/gameNames.ts`: `ring-equipped`のメッセージ分岐が指輪4種目でif-chain 4分岐になり`functional-style.md`の許容上限(3分岐)を超えるため、`gameNames.ts`に`RING_EQUIPPED_EFFECT`(`Partial<Record<ItemKind, string>>`)ルックアップテーブルを新設し、`messages.ts`側は対応エントリがなければ`throw`(非リング種でring-equippedが発火するのは真のバグなので`error-handling.md`のthrow対象)
- [x] `src/game/items/rings.test.ts`・`src/game/frame.test.ts`・`src/game/floor/items.test.ts`・`src/shell/messages.test.ts`: 各パターンのテストを追加
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、視界外・未探索の敵が指輪なしでは非表示・装備時のみ`buildFrameGrid`に表示されることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 840件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン87完了(2026-07-20)。**

## マイルストーン88 — 雪男(頑丈だが低頻度に出現する近接アタッカー)

未反映ブランチの内容の再実装、第6弾(方針はマイルストーン83を参照)。原作Rogueの雪男(Yeti)に着想を得た敵。雪男そのものを描く単一コードポイントの安定絵文字は存在しないため、雪山の獣という近い代替として🐻(熊、Unicode 6.0)を採用する。オーク・ドラゴンと同じ「パラメータだけで差別化する」パターンを踏襲し、HP・攻撃力・出現率ともオーク(HP4)とドラゴン(HP8)の中間に位置づける。深さスケーリングはせず独立per-floor抽選。

- [x] `src/game/events.ts`: `ENEMY_KIND_VALUES`に`"yeti"`を追加(新規`GameEvent`は不要)
- [x] `src/game/balance.ts`: `YETI_MAX_HP = 5`・`YETI_ATTACK_DAMAGE = 3`・`YETI_ACTIONS_PER_TURN = 1`・`YETI_SPAWN_CHANCE_PERCENT = 15`(オークの20とドラゴンの8の中間)を追加し、`ENEMY_MAX_HP`/`ENEMY_ATTACK_DAMAGE`/`ENEMY_ACTIONS_PER_TURN`/`ENEMY_EXPERIENCE_REWARD`に`yeti`のエントリを追加(経験値はオークの3とドラゴンの6の中間で4)
- [x] `src/game/floor/enemies.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/catalogData.ts`: 他の独立per-floor抽選kindと同じ形で追加
- [x] `src/game/format/validateGameState.ts`: 変更不要(`isEnemyKind`は自動導出)。列挙値追加のみのためセーブ形式の構造変更なし
- [x] `src/game/floor/enemies.test.ts`: スポーンテーブルへの参加を確認
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、雪男を`advanceTurn`のバンプ攻撃で撃破でき、経験値4(オークとドラゴンの中間)が入ることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 840件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン88完了(2026-07-20)。**

## マイルストーン89 — 魔法の矢の杖(4種類目の杖、命中の杖より高威力・低頻度)

未反映ブランチの内容の再実装、第7弾(方針はマイルストーン83を参照)。原作Rogueの"wand of magic missile"に着想を得た、命中の杖・鈍足の杖・テレポートの杖に続く4種類目の杖。効果は命中の杖と同じ(視界内最近接の敵に固定ダメージ、不意打ち倍率なし)だが、ダメージが高い代わりに出現率が低い。既存の`wand-struck`イベントをそのまま再利用する(新規イベント不要)。`combat.ts`の`applyWandStrike`(固定`WAND_STRIKE_DAMAGE`)には手を入れず、共有コア`applyEnemyHit`を使う新規`applyMagicMissileWandStrike`を並べて追加するだけに留める。

- [x] `src/game/events.ts`: `ItemKind`に`"magic-missile-wand"`を追加(新規`GameEvent`は不要——既存の`wand-struck`をそのまま再利用)
- [x] `src/game/balance.ts`: `MAGIC_MISSILE_WAND_DAMAGE = 5`(`WAND_STRIKE_DAMAGE`の3より高い)・`MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT = 6`(`WAND_SPAWN_CHANCE_PERCENT`の8より低い)を追加
- [x] `src/game/combat.ts`: `applyMagicMissileWandStrike(state, target)`(`applyWandStrike`と同型、`applyEnemyHit`を`MAGIC_MISSILE_WAND_DAMAGE`で呼ぶだけ)を追加
- [x] `src/game/items/wands.ts`: `applyUseMagicMissileWand(state)`——`findNearestVisibleEnemy`で対象を選ぶ、他の杖と同じ無効果パターン
- [x] `src/game/items/use.ts`: `applyItemEffect`に`case "magic-missile-wand"`を追加
- [x] `src/game/floor/items.ts`・`src/game/glyphs.ts`・`src/shell/gameNames.ts`・`src/shell/itemCatalog.ts`: 他の杖と同じ形で追加
- [x] `src/game/format/validateGameState.ts`: 変更不要(新規イベントなし、`ItemKind`は自動導出)。列挙値追加のみのためセーブ形式の構造変更なし
- [x] `src/game/combat.test.ts`・`src/game/items/wands.test.ts`・`src/game/floor/items.test.ts`: 各パターンのテストを追加
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、魔法の矢の杖が視界内最近接の敵に`MAGIC_MISSILE_WAND_DAMAGE`(5)のダメージを与えることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 844件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン89完了(2026-07-20)。**

## マイルストーン90 — 混乱の巻物(敵を混乱させ、ランダムに動かす)

未反映ブランチの内容の再実装、第8弾(方針はマイルストーン83を参照)。原作Rogueの"scroll of confuse monster"に着想を得た巻物。視界内最近接の敵を一定ターン混乱させ、その間はプレイヤーへの追跡(A*)を止めてランダムに徘徊させる——隣接していれば通常どおり攻撃/窃盗はする。鈍足の杖が確立した`Enemy.slowedTurnsRemaining`と対になる`Enemy.confusedTurnsRemaining`を`state.ts`に新設する(構造変更のため`SAVE_FORMAT_VERSION`を30に)。杖4種が共有していた「視界内最近接の敵を自動選択する」`findNearestVisibleEnemy`を、巻物からも使えるよう`items/wands.ts`から`vision.ts`へ移設して共有する。

- [x] `src/game/vision.ts`: `items/wands.ts`にあった`findNearestVisibleEnemy(state)`をここへ移設しexportする(視界判定ロジックという責務が本来の置き場と一致するため)
- [x] `src/game/items/wands.ts`: ローカル定義を削除し`vision.ts`からimportするよう変更(4種の杖の呼び出し側は無改造)
- [x] `src/game/events.ts`: `ItemKind`に`"confuse-monster-scroll"`を追加。`GameEvent`に`enemy-confused`(payload: `target: EnemyKind`・継続ターン数`turns`)を追加
- [x] `src/game/state.ts`: `Enemy`に`confusedTurnsRemaining: number`(`slowedTurnsRemaining`と対称、構造変更)を追加
- [x] `src/game/balance.ts`: `CONFUSE_MONSTER_SCROLL_DURATION = 8`・`CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT = 10`を追加
- [x] `src/game/floor/enemies.ts`: 敵生成の全3箇所(ゾンビ・コウモリのスケーリング湧き・`ENEMY_SPAWN_TABLE`の各種・モンスターハウス)に`confusedTurnsRemaining: 0`を追加
- [x] `src/game/enemies.ts`: `advanceEnemies`に、眠り判定の直後で`confusedTurnsRemaining`を1減らした値を`nextEnemies`用に保持しつつ、今回のターンの追跡判定を「混乱していなければ(このターン開始時点の値で判定)視界内でA*追跡、そうでなければランダム徘徊」に変更。`slowedTurnsRemaining`による行動スキップ分岐でも`confusedTurnsRemaining`を減衰させて`nextEnemies`に積む
- [x] `src/game/items/scrolls.ts`: `applyUseConfuseMonsterScroll(state)`——`findNearestVisibleEnemy`で対象を選び、無効果パターンは他の杖と同一。対象が見つかれば`confusedTurnsRemaining`をセットし`enemy-confused`を記録
- [x] `src/game/items/use.ts`: `applyItemEffect`に`case "confuse-monster-scroll"`を追加
- [x] `src/game/floor/items.ts`・`src/shell/gameNames.ts`・`src/shell/itemCatalog.ts`: 追加(現行develop方式では巻物は全種`📜`共有・実名即時表示のため、元ブランチの専用アイコン`💫`案は採らず既存の共有絵文字規約に合わせた)
- [x] `src/game/format/validateGameState.ts`: `enemies`の各要素に`confusedTurnsRemaining`(0以上の整数)の検証を追加。`enemy-confused`イベントの検証ケースを追加。`Enemy`の構造変更のため**`SAVE_FORMAT_VERSION`を30に**
- [x] `src/game/format/saveFormat.ts`・`saveFormat.test.ts`: バージョン変更履歴コメント更新、shape guardに`confusedTurnsRemaining: "number"`を追記
- [x] 実装中に`enemies.ts`が201行に達し行数ゲート(200行)に抵触したため、盗賊/ニンフの「隣接時に盗んで逃げる」ロジックを新規`enemyFlee.ts`の`resolveFleeingTheft`に切り出し、あわせて`advanceEnemies`の巨大docコメントを圧縮して185行まで削減した(`enemies.ts`側は`enemy.kind === "thief" || "nymph"`の1分岐+関数呼び出しに縮小)
- [x] `src/game/items/scrolls.test.ts`・`src/game/enemies.test.ts`(混乱中は視界内でも追跡せず徘徊すること・隣接していれば混乱中でも攻撃すること・ターン経過で減衰し0で通常の追跡に戻ることを含む)・`src/game/floor/items.test.ts`・`src/shell/messages.test.ts`・`format/validateGameState.test.ts`: 各パターンのテストを追加
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、混乱の巻物を使うと視界内の敵の`confusedTurnsRemaining`が立ち`enemy-confused`イベントが記録されること、以後その敵が視界内でも直線的なA*追跡から外れて徘徊することを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 851件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン90完了(2026-07-20)。**

## マイルストーン91 — 捕獲のわな(4種類目のわな、プレイヤーを一時麻痺させる)

未反映ブランチの内容の再実装、第9弾(方針はマイルストーン83を参照)。原作Rogueの熊わな(bear trap)に着想を得た、矢・落とし穴・テレポートに続く4種類目のわな。ダメージは0固定(トラップドア・テレポートの罠と同じ「一撃の脅威ではなく行動の制約そのものが罰則」という位置づけ)で、代わりに麻痺の薬と同じ`paralyzedTurnsRemaining`をセットする——新規の状態フィールドは追加せず、既存の`paralyzedTurnsRemaining`ティック・ステータスバー表示チップをそのまま再利用する。`trapTrigger.ts`の`applyTrapTrigger`が既に確立している「`trap.kind === "X" && status === "playing"`なら追加の副作用を返す」という分岐パターンに3件目として合流する(4件目(マイルストーン97の錆びわな)でこのif連鎖が`functional-style.md`の許容上限に触れる見込み——そのときにルックアップテーブルへ置き換える)。kindの内部識別子は原作Rogueの用語のまま`"bear"`とした(プレイヤー向け表示名は`TRAP_NAMES`経由で「捕獲のわな」)。

- [x] `src/game/events.ts`: `TRAP_KIND_VALUES`に`"bear"`を追加(新規`GameEvent`は不要——既存の`trap-triggered`をそのまま再利用。麻痺状態自体は`player-paralyzed`ではなく`paralyzedTurnsRemaining`を直接セットするだけなので、こちらも新規イベント不要)
- [x] `src/game/balance.ts`: `BEAR_TRAP_DAMAGE = 0`・`BEAR_TRAP_PARALYSIS_DURATION = 3`(`PARALYSIS_POTION_DURATION`と同じ長さ)・`BEAR_TRAP_SPAWN_CHANCE_PERCENT = 15`を追加し、`TRAP_DAMAGE`に`bear`のエントリを追加
- [x] `src/game/trapTrigger.ts`: `applyTrapTrigger`に`trap.kind === "bear" && afterTrap.status === "playing"`の分岐を追加し`paralyzedTurnsRemaining`をセット
- [x] `src/game/floor/traps.ts`: `BEAR_TRAP_SPAWN_CHANCE_PERCENT`による独立per-floor抽選を追加(GOAL_FLOOR除外なし——同一フロア内で完結する効果のため)
- [x] `src/shell/gameNames.ts`・`src/shell/catalogData.ts`: `TRAP_NAMES`/`TRAP_CATALOG`にエントリを追加(ダメージ0なので既存の「◯を踏んでしまった!」分岐がそのまま適用され、新規文言は不要)
- [x] `src/game/format/validateGameState.ts`: `trap-triggered`イベント検証の「ダメージ0系」判定に`"bear"`を追加。`isTrapKind`は自動導出のため変更不要
- [x] `src/game/trapTrigger.test.ts`・`src/game/floor/traps.test.ts`・`format/validateGameState.test.ts`: 各パターンのテスト(麻痺すること・移動できなくなること・レビテーション中は無効化されることを含む)を追加
- [x] パイプライン確認: `npm run build`後、`dist/game/index.mjs`を直接importするNodeスクリプトで、捕獲のわなを踏むとダメージなしで`paralyzedTurnsRemaining`がセットされ、以後の移動アクションが実際に無効化されることを確認した

自動テスト(型検査・lint+行数ゲート・Vitest 854件・knip・build)通過、`npm run docs:catalog`で`docs/catalog.md`を更新して完了。

**マイルストーン91完了(2026-07-20)。**

## バックログ(マイルストーン未整理)
- 状態異常の`statusEffects`コレクション化(現状は`xxxTurnsRemaining`6本+tickファイル6個+フラグ5本の並列増殖方式で、1種追加=7点セットの変更。汎化にもセーブ形式・検証の実コストがあるため、8種類目の状態異常を入れるときに再評価)
- **インベントリ/コマンドUXの拡充(開発テーマ化、2026-07-17決定)**: 「CLIの範疇でどこまでリッチなUXを実現できるか」を本プロジェクトの開発テーマの一つと位置づけ、不思議のダンジョンシリーズ級の操作感を目指す方向で個別課題を統合する。発端は2026-07-16テストプレイの指摘(識別の巻物が`POTION_KINDS`先頭順で手持ちと無関係な種類を鑑定し、手持ちの「未鑑定の薬」が変わらない)で、当初の最小修正案「インベントリ優先化」はこのテーマに吸収。具体候補: ①識別の巻物はアイテム選択プロンプトで対象を選ぶ(トルネコ式) ②階段は踏んだだけでは降りず「降りる」コマンドで意思確認する ③アイテムの「使う」以外の動詞(置く・投げる等)。着手時は設計マイルストーンから始める(選択UI=シェル側の入力モード追加であり、`GameState`に選択状態を持たせない設計判断が必要)
  - **毒薬の出口問題**(2026-07-18テストプレイの指摘): 毒薬は「未鑑定ギャンブルの毒針」という飲む前の役割しかなく、鑑定後は何の使い道もなくインベントリに居座る。マイルストーン80で「捨てる」は解決したが、③「投げる」(視界内最近敵への自動照準で毒ダメージ、杖と同じ骨格が流用可能)は依然未実装
  - **指輪2個目問題**(同日指摘): 再生/満腹の指輪はON/OFFフラグのため2個目は消費されるだけで完全に無駄。マイルストーン80の「捨てる」で出口はできたが、鑑定済み2個目の指輪を積極的に活用する動詞(売る等)や重複入手時の扱いの設計は未検討のまま
  - **カーソル方式の採用を決定(2026-07-18)**: レターショートカット方式(a,b,c...)は廃止し、オーバーレイ内は↑↓(＋vi文化のj/k)＋決定キーのカーソル選択に統一する。理由: ①動詞サブメニュー(使う/投げる/置く)・識別の対象選択・杖のターゲット選択が全部「選択UI」1部品に乗る ②UX基準の不思議のダンジョン系はカーソルメニュー文化 ③アイテムスロット制(容量上限)と自然に接続 ④レター方式は`i`衝突(マイルストーン66)のようなキー割当パッチの温床。設計上の留意: `docs/design.md`の「1キー1操作」原則の意識的な改訂とセットで行う(マップ上は1キー1操作、オーバーレイ内はカーソル、と再定義)。`Action`は`kind`ベース維持(スロットindex参照にするとリプレイがインベントリ並び順に依存して脆くなる)。カーソル位置はシェル側の表示状態でGameStateに入れない。レターの補助併存は最初はしない(二重系統は事故の温床、遅ければ後付け)。**マイルストーン80**でスロット制容量上限と「使う/捨てる」の2段階選択を先行実装したが、まだレター方式のまま(カーソル方式への本格移行はこのバックログの範囲として残っている) — 移行時はレター版の`toSelectedItemKind`/`toItemVerbAction`(`src/game/inventoryKeymap.ts`)を置き換える形になる見込み
- ポーションのフレーバーテキストのランダム割り当て(マイルストーン23では見送り。`GameState`に人間向け文字列を直接持たせずに実現する方法——例えば`messages.ts`側でシードから決定的に導出する、または`GameState`にはフレーバー"インデックス"のみを整数で持たせ文字列プールへの変換は`messages.ts`に閉じ込める——が固まったら再検討)
- `formatEvent`が描画のたびに現在の鑑定状態で評価されるため、鑑定済みになった潜在的アイテムの過去ログ行の表示が遡って変わる件(マイルストーン23で確認・許容と判断)。気になる場合はイベント発生時点の鑑定状態をpayloadに焼き込む設計に変更する
- 他の指輪効果の追加(マイルストーン31で再生の指輪、マイルストーン33で満腹の指輪=遅消化を実装。原作Rogueには他に怪力・耐久・索敵・透明視・瞬間移動・敵召喚・敏捷・防御・隠密などがある。マイルストーン33では「拾った時点では汎用名`指輪`のまま、効果は装備した瞬間に明かされる」という簡略化で決着した——鑑定リスト化はまだ不要)
- 他の未鑑定アイテムカテゴリの導入(マイルストーン23で確立した「`identifiedPotionKinds`的な鑑定リスト+`messages.ts`側での表示分岐」という型を横展開できる。巻物・指輪はどちらもこの型を使わない単純な形で導入した——将来的に未鑑定にしたくなったら再検討)
- ダメージの乱数幅(マイルストーン15で正規分布版`rollDamage`を実装したが撤回。`src/game/damage.ts`にユーティリティとテストを残してあるので、再導入時は`combat.ts`/`enemies.ts`から呼び直すだけで済む)
- スケジューラ接続(`src/scheduler/`のspeed schedulerは今も未使用。敵の速度差自体はマイルストーン9でプレーンデータ方式により解決済み。クロージャベースのSchedulerがリデューサの`GameState`と根本的に相性が悪いことが判明したため、実際に接続するとしたらリデューサ外の非ターン制な何かが対象になる)
- 扉ギミック(封印中): 鍵つき扉など「特殊な出入口」として意味を持たせられるようになったら再導入。ただの通過タイルなら不要(不思議のダンジョン系準拠)。焼き込み実装はコミット9cf29be、見分けづらさ・2マス通路問題はgame-history.mdマイルストーン2の記録を参照
- 絵文字セット(100種程度)の選定(`docs/design.md` の未解決項目)
- 視界方式の再検討: 現行はshadowcasting(放射状・半径8)。オリジナルRogue/不思議のダンジョン式「部屋に入ったら部屋全体が見える+通路は周囲1マス」に変える場合は、部屋矩形をGameStateに保存する必要がある(マイルストーン65で`FloorLayout`までは部屋矩形を載せたが、GameStateには未保存=セーブ形式変更が必要)。プレイフィールを見て判断
- リリース運用(正式リリースを始めるとき、2026-07-14の議論): ①アプリはsemver、セーブ形式は単調増加の整数、**両者は独立の軸**でCHANGELOGに対照表(アプリver↔形式ver)を記録 ②コードの互換判定は`formatVersion`のみ(アプリverをパースして判定に使わない) ③セーブに`appVersion`を参考情報として併記(サポート用、判定不使用) ④旧形式の切り捨てをやめる時期になったら`parseSaveFileContent`の`unsupported-version`分岐がマイグレーションの差し込み口 ⑤既製のsemverスキルはConventional Commits前提でGitmoji規約と不適合 — 必要になったら自作`/release`スキル(バンプ→CHANGELOG→タグ→push)を書く
