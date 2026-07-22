# 絵文字選定基準

`docs/design.md` の核心方針「絵文字幅の実行時計測は信用せず、設計で決め打ちする」を守るために、実際どの絵文字なら安全かを判定する基準をここにまとめる。これまで `docs/design.md`・`docs/architecture.md`・`src/game/glyphs.ts` の各コメント・`docs/tasks/modernization.md` Stage 5 に散らばっていた根拠を1箇所に集約したもの。**新しい絵文字をタイル/chromeに追加するときは、必ずここの基準で確認する。**

「今どの絵文字が何に割り当て済みか」「過去に何を検討して却下したか」の実績台帳は `docs/emoji-registry.md`(手動更新)。本ファイルは判定基準そのもの、`emoji-registry.md`は個々のグリフの割り当て実績という役割分担。

基準4(Unicodeバージョンの上限)は対応環境の実装状況に紐づく**生きた基準**であり、固定の真実ではない。定期的に(目安: 半年〜1年に一度、または新しい絵文字を追加検討するタイミングで)最新の対応状況を調べ直し、`## 決定の記録(ADR)` に追記する。

## なぜこれが要るか

このゲームは1論理セル=1絵文字=2カラム(`TILE_W = 2`)を前提にマップを描画する(`docs/design.md`)。この前提が崩れる絵文字が1つでも混ざると、マップ全体の桁がずれる。絵文字の実際の表示幅は「その絵文字がどのUnicodeコードポイント列でできているか」と「端末・フォントがそれをどう解釈するか」の組み合わせで決まり、実行時に正確な幅を計測する信頼できる方法が無い(wcwidth系ライブラリは絵文字に対して不正確)。だから「幅が予測可能な絵文字だけを設計時に選ぶ」という決め打ち戦略を取っている。

## 判定基準(4つ)

タイル用・chrome用(マイルストーン68以降、chromeもタイルと同じ基準)を問わず、新しい絵文字候補は以下の4点を満たすこと。

### 1. 単一コードポイントであること(結合絵文字を避ける)

👨‍👩‍👧‍👦 のような絵文字は、複数のUnicode文字をZWJ(Zero Width Joiner, U+200D)でつなげて1つの絵に見せている「結合絵文字」。端末やフォントのZWJ対応が甘いと結合が解けて構成要素が別々のグリフとして分裂表示され、桁数が想定より増える。国旗絵文字(地域インジケータ2文字の組)や肌色修飾(Fitzpatrick modifier)も同じ理由で避ける。

確認方法: Node REPLで `[..."👨‍👩‍👧‍👦"].length` のようにスプレッド展開した配列長を見る。1なら単一コードポイント、2以上なら結合絵文字。

### 2. Variation Selector(VS16)を必要としないこと

⚠️・❤️・🛡️ のような記号は、元々Unicodeの古い版に「白黒のテキスト記号」として存在していたものが、後から絵文字として使えるよう拡張された文字。この手の文字は**デフォルトの見た目が曖昧**で、何も付けなければ狭い(1桁の)白黒グリフとして表示される環境がある。「カラーの絵文字として2桁幅で出せ」と明示するには、見えないVS16(U+FE0F, Variation Selector-16)という修飾コードポイントを直後に付ける必要がある。

これは実質的に基準1のZWJと同じ問題を持つ: VS16も「対応が甘い環境では欠落し得る追加コードポイント」であり、欠落すると幅が1桁に戻って桁がずれる。だから「VS16が要る文字」自体を避ける。逆に🧟や📜のように最初から絵文字前提でUnicodeに追加された文字は、VS16なしでも単体でデフォルトが2桁カラー表示になる。

確認方法: 基準1と同じく `[...character].length` で2以上ならVS16(または他の結合)が付いている。`emoji-variation-sequences.txt`(Unicode公式)や絵文字リファレンスサイトで「text default / emoji default」の記載を確認する手もある。

例外: `src/game/glyphs.ts` の `FALLBACK_CELL`(⚠️、壊れたタイル値用のフォールバック)はあえてVS16付き絵文字を使っている。通常プレイでは描画されない想定の異常系グリフであり、`GameScreen.test.tsx` でこの文字自体を「VS16付き絵文字でも幅崩れが起きないこと」の回帰テスト対象にしている — 基準そのものの検証用の意図的な例外。

**この基準は環境が新しくなっても解消しない**(2026-07-19に裏取り済み、`## 決定の記録(ADR)` 参照)。VS16の幅計算はWindows Terminal自体のバグとして現在も未解決で、対応が「甘い」のは古い環境に限らない。だから基準4(Unicodeバージョンの新しさ)を緩めても、この基準2だけは独立に厳格運用する。

### 3. East Asian Width が Wide であること(Ambiguousを避ける)

Unicodeの文字幅プロパティ(East Asian Width)には Narrow(1桁確定)・Wide(2桁確定)・Ambiguous(環境依存で1桁にも2桁にもなる)などの区分がある。Wideなら安全、Ambiguousは避ける。`docs/tasks/modernization.md` Stage 5 に実例がある: 床タイルに使っていた半角中黒「・」がAmbiguous区分だったため、実機で1〜2px左寄りにズレて見えた。絵文字🟫(Wide)に差し替えて解消している。

### 4. Unicode 15.1(Emoji 15.1)以下であること

**現在の許可ライン: Unicode 15.1(Emoji 15.1)まで。Unicode 16.0以降は保留。**(2026-07-19決定、根拠は `## 決定の記録(ADR)` 参照)

新しいバージョンの絵文字ほど、絵文字対応フォント(Windows: Segoe UI Emoji)側の実装が追いついていないリスクが高い。ただし「対応が甘い環境」は古いOSに限らない話で、フォント更新とターミナルアプリ本体の更新は別々のリリースサイクルで動くため、対象を「最新のWindows 11 + 更新済みWindows Terminal」に絞っても油断はできない。目安が「Unicode 6.0以前」のような曖昧な言い方だったのは、対象環境を具体的に絞らずに安全マージンを広く取っていたため。対象を明確にした上で調べ直した結果が上記のライン(旧基準よりかなり緩い)。

確認方法: 候補の絵文字が導入されたUnicode/Emojiバージョンを [emojipedia](https://emojipedia.org/) 等のリファレンスで確認し、15.1以下かどうかを見る。

## 適用範囲

- **マップタイル**(`src/game/glyphs.ts` の `TERRAIN_GLYPHS`/`ENEMY_GLYPHS`/`ITEM_GLYPHS`等): 上記4基準を厳格に適用。
- **chrome(ステータスバー等の周辺UI)**: マイルストーン68で「絵文字全面禁止」から改訂され、タイルと同じ4基準を満たすものだけ許可(`docs/architecture.md`)。💰が先例、現在は🍖💪🦺も使用。
- 基準を満たさない概念(階数「1F」・「HP」等)は、無理に絵文字化せず文字表記のまま残してよい(`docs/tasks/game.md` マイルストーン68に判断例あり)。
- **chromeの絵文字は直後に必ず半角スペースを1つ置く**(2026-07-19、マイルストーン74の実機テストプレイで判明)。マップタイルは`TILE_W = 2`のグリッドで桁が確保されるが、chromeは`<Text>`内の素のテキスト連結でその保証が無い。4基準を満たす絵文字(🪽等)でも、直後に別の文字(`(`等)が隙間なく続くと実機でめり込んで見えることがある。`💓 {value}`のように常に1文字分の空白を挟むことで、基準4個より安く回避できる。

## 新しい絵文字を追加する手順

1. 候補を選ぶ
2. `[...候補].length` で単一コードポイントか確認(基準1・2)
3. Unicode公式データまたは絵文字リファレンスでEAWとデフォルト表示(text/emoji)・導入バージョンを確認、Unicode 15.1以下か見る(基準3・4)
4. `src/game/glyphs.ts` に追加する際、選定理由をコメントで残す(既存エントリのコメント形式に倣う)
5. Windows Terminalでの実機確認(`npx unrun scripts/demo-renderer.ts` 等)。基準を満たしていても実機確認は省略しない

## 決定の記録(ADR)

### 2026-07-19: Unicodeバージョン上限を「6.0以前」→「15.1以下」に緩和、VS16回避とWindows Terminal限定は維持

**背景**: 巻物系アイテムの絵文字統一(マイルストーン72)の議論から、杖の絵文字🔮(水晶玉)が「杖」の意味とズレている問題が浮上。候補の🪄(マジックワンド)は単一コードポイント・VS16不要で基準1〜3は満たすが、当時の基準4(Unicode 6.0以前)には収まらず除外されていた。「Windows Terminal固定なのに基準6.0はさすがに古すぎでは」という疑問から、対応状況を調べ直した。

**調べたこと**:
- Windows Terminalの絵文字幅計算バグは、最新版でも解消していない現在進行形の問題([microsoft/terminal#8970](https://github.com/microsoft/terminal/issues/8970)、[#17342](https://github.com/microsoft/terminal/issues/17342)、他ターミナル横断比較の [jeffquast.com](https://www.jeffquast.com/post/ucs-detect-test-results/) でもWindows Terminalは「VS-16付き絵文字が次の文字と重なる」と報告あり)。→ **基準2(VS16回避)は環境の新しさに関係なく維持すべき**と判断
- Segoe UI Emojiの絵文字バージョン追従ペース: Emoji 15.0はWindows 11 23H2(2023年秋)で搭載。Emoji 15.1(2023年9月策定)はWindows側の広い展開が2024年6月ごろ([mspoweruser.com](https://mspoweruser.com/support-for-emoji-15-available-for-windows-11-here-is-how-to-enable-it/))。Emoji 16.0(2024年9月策定)はWindows 11 **24H2限定**で2025年8〜9月にようやく展開開始、絵文字パネルはまだ未対応との報道([windowslatest.com](https://www.windowslatest.com/2025/09/09/windows-11-24h2-rolls-out-emoji-16-0-support-but-it-doesnt-work-properly-yet/))
- macOS(Terminal.app/iTerm2)・Linux(ディストリ・DE次第でターミナルもフォントも不定)は、Windows Terminal+Segoe UI Emojiという単一ベンダー管理の組み合わせに比べて「決め打ち可能な的」が無いことを確認。対象環境拡大は見送り、Windows Terminal限定を維持する判断を補強する形になった

**決定**:
1. Unicodeバージョンの許可ラインを **15.1以下** に更新(2026-07時点でWindows 11の広い展開から約2年経過しており枯れている。16.0は展開から日が浅く24H2限定のため保留)
2. VS16回避(基準2)は緩めない — Windows Terminal自体の未解決バグであり、環境を最新に絞っても解消しない
3. 対象環境はWindows Terminal限定を維持 — macOS/Linuxは対応の的が定まらないため拡大しない

**Status**: 決定・反映済み。次回見直し時期の目安は2027年前半、またはUnicode 16.0のWindows展開が進んだと判断できるタイミング。

**保留事項**: この基準変更で🪄(Emoji 13.0)が候補として使用可能になった。🔮→🪄への実際の差し替えは2026-07-19中に別件として実施済み(`docs/tasks/game.md` マイルストーン73)。

## 参照

- `docs/design.md` — 「絵文字幅の実行時計測を信用しない」という核心方針の出どころ
- `docs/architecture.md` の「レンダラーの設計判断」節 — タイル/chrome共通基準の適用箇所
- `src/game/glyphs.ts` — 各グリフの個別選定コメント
- `docs/tasks/modernization.md` Stage 5 — EAW Ambiguous文字で実際に幅崩れが起きた記録
- `src/renderer/GameScreen.test.tsx` — VS16付き絵文字の幅崩れ回帰テスト
- [microsoft/terminal#8970](https://github.com/microsoft/terminal/issues/8970) — VS16/VS15の幅計算バグ(未解決)
- [microsoft/terminal#17342](https://github.com/microsoft/terminal/issues/17342) — conhost/openconsoleでの絵文字幅の誤り
- [Terminal Emulators Battle Royale – Unicode Edition!](https://www.jeffquast.com/post/ucs-detect-test-results/) — 主要ターミナル横断のVS16対応比較
- [Windows 11 24H2 rolls out Emoji 16.0, but there's a catch](https://www.windowslatest.com/2025/09/09/windows-11-24h2-rolls-out-emoji-16-0-support-but-it-doesnt-work-properly-yet/) — Emoji 16.0のWindows展開状況
- [Support for Emoji 15 available for Windows 11](https://mspoweruser.com/support-for-emoji-15-available-for-windows-11-here-is-how-to-enable-it/) — Emoji 15.xのWindows展開時期
