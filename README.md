# emoji-rogue

絵文字で描画するCLIローグライク。ASCIIの制約下で表現を磨いたRogueの精神を、「等幅ではないが意味を持つ記号」である絵文字で現代的にやり直す試み(絵文字ゲームシリーズ第1弾)。

土台は[rot.js](https://github.com/ondras/rot.js)のフォークで、マップ生成・FOV・経路探索・ターン制スケジューリングを関数型スタイル+最新TypeScriptに全面書き換えたもの。その上に純粋リデューサ方式のゲーム層とInk製絵文字レンダラーを載せている。

## 現在の状態(開発中)

diggerが生成したダンジョンを🧑が歩き回れるところまで(壁判定つき)。敵・アイテム・FOVはこれから。進捗は [docs/tasks/game.md](docs/tasks/game.md) を参照。

## 遊び方

```
npm ci
npm run build
npm start
```

- 移動: 矢印キー または hjkl
- 終了: q(またはCtrl+C)

## 動作環境(重要)

- **Node.js >= 20**
- **Windows Terminal必須**(Windows 11の既定ターミナルであればそのままでOK)。カラー絵文字はターミナルのフォントフォールバック(Segoe UI Emoji)で描画されるため、設定フォント自体は等幅フォントなら何でもよい
- 旧コンソールホスト(conhost)はカラー絵文字を描画できないため**非対応**
- macOS/Linuxの各種ターミナルは未検証(カラー絵文字+全角幅のフォールバックが効く環境なら動く見込み)

**表示崩れは既知の制約であり、バグとは限りません。** 絵文字の描画幅・対応範囲はターミナル・OS・フォントの世代に依存します。本プロジェクトは実行時の幅計測を意図的に行わず(絵文字では信用できないため)、1タイル=2カラム決め打ち+技術的に安定した絵文字の厳選で対処しています。これは「フォント設定はユーザーが合わせる」という旧来ローグ文化の現代的踏襲です。詳細は [docs/design.md](docs/design.md)。

## ドキュメント

- [docs/architecture.md](docs/architecture.md) — コードベースの読み方
- [docs/design.md](docs/design.md) — 製品コンセプトと絵文字方針
- [docs/tasks/game.md](docs/tasks/game.md) — ゲーム開発タスクトラッカー
- [docs/tasks/modernization.md](docs/tasks/modernization.md) — rot.js近代化改修の全記録(完了済み)

## 近代化rot.jsコアだけ欲しい場合

ゲーム固有のコードを含まない「近代化されただけのrot.js」は **`modernization`ブランチ**(タグ `modernization-complete` 相当)として独立に保存しています。マップ生成器8種・FOV・A*/Dijkstra・スケジューラ等を、原本と挙動互換(乱数消費順まで一致検証済み)のままESM+strict TypeScript+クラスなしで使えます。詳細はそちらのREADMEを参照。

## ライセンス

原本rot.jsと同じ [BSD-3-Clause](license.txt)。rot.jsの作者は [Ondřej Žára](https://github.com/ondras)。
