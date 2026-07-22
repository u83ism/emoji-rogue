# オリジナルRogue 5.4 仕様メモ

> 2026-07-23、「emoji-rogueはRogue忠実路線・不思議のダンジョン由来要素は削除」という方針決定を受けて作成。
> RogueBasinはこの環境からのアクセスがブロックされている(ドメイン単位でbot判定、403)ため、**実際のRogue 5.4ソースコード**(`https://github.com/lcn2/rogue5.4` — Roguelike Restoration Projectによる、実機のRogue 5.4に忠実な保守版)を直接読んで抽出した。コードそのものは引用・移植せず、仕様(数値・ルール)だけをここに書き起こす方針(ライセンスがフリーソフトウェアの定義上クリーンではないため — 詳細は本人との会話履歴を参照)。
> 目的はbalance.tsとの照合材料。未検証な伝聞情報(RogueBasin等の二次資料)は含めず、ソース上で確認できた事実のみ記載する。

## モンスター表(26種、A〜Z)

`extern.c`の`monsters[]`テーブルより。`class`はHPのダイス数(HP = `class`d8をレベル生成時にロール)、`arm`は防御力(**低い/負が強い**、Rogueは値が小さいほど硬い設計)、`dmg`はダメージダイス("1x8"=1d8、複数回攻撃は"/"区切り)。

| 文字 | 名前 | carry% | 特殊フラグ | exp基準値 | class(HPダイス数) | arm | dmg |
|---|---|---|---|---|---|---|---|
| A | aquator | 0 | MEAN | 20 | 5 | 2 | 0x0/0x0(直接ダメージ無し、錆びさせる) |
| B | bat | 0 | FLY | 1 | 1 | 3 | 1x2 |
| C | centaur | 15 | - | 17 | 4 | 4 | 1x2/1x5/1x5 |
| D | dragon | 100 | MEAN | 5000 | 10 | -1 | 1x8/1x8/3x10(ブレス) |
| E | emu | 0 | MEAN | 2 | 1 | 7 | 1x2 |
| F | venus flytrap | 0 | MEAN | 80 | 8 | 3 | (固定・動けない) |
| G | griffin | 20 | MEAN/FLY/REGEN | 2000 | 13 | 2 | 4x3/3x5 |
| H | hobgoblin | 0 | MEAN | 3 | 1 | 5 | 1x8 |
| I | ice monster | 0 | - | 5 | 1 | 9 | 0x0(凍らせる) |
| J | jabberwock | 70 | - | 3000 | 15 | 6 | 2x12/2x4 |
| K | kestrel | 0 | MEAN/FLY | 1 | 1 | 7 | 1x4 |
| L | leprechaun | 0 | - | 10 | 3 | 8 | 1x1(金を盗んで消える) |
| M | medusa | 40 | MEAN | 200 | 8 | 2 | 3x4/3x4/2x5 |
| N | nymph | 100 | - | 37 | 3 | 9 | 0x0(アイテムを盗んで消える) |
| O | orc | 15 | GREED | 5 | 1 | 6 | 1x8(金を守る) |
| P | phantom | 0 | INVIS | 120 | 8 | 3 | 4x4 |
| Q | quagga | 0 | MEAN | 15 | 3 | 3 | 1x5/1x5 |
| R | rattlesnake | 0 | MEAN | 9 | 2 | 3 | 1x6(毒) |
| S | snake | 0 | MEAN | 2 | 1 | 5 | 1x3 |
| T | troll | 50 | REGEN/MEAN | 120 | 6 | 4 | 1x8/1x8/2x6 |
| U | black unicorn | 0 | MEAN | 190 | 7 | -2 | 1x9/1x9/2x9 |
| V | vampire | 20 | REGEN/MEAN | 350 | 8 | 1 | 1x10(最大HPを吸収) |
| W | wraith | 0 | - | 55 | 5 | 4 | 1x6(経験値を吸収) |
| X | xeroc | 30 | - | 100 | 7 | 7 | 4x4(アイテムに擬態) |
| Y | yeti | 30 | - | 50 | 4 | 6 | 1x6/1x6 |
| Z | zombie | 0 | MEAN | 6 | 2 | 8 | 1x8 |

**出現階層**: `randmonster()`が`level + (rnd(10) - 6)`でA〜Zのインデックスを決める。単純化すると「深い階ほど後ろの文字(強いモンスター)が出やすい」——26種は26階層に緩やかに対応している。

**emoji-rogueに存在しないモンスター名**: centaur/venus flytrap/griffin/hobgoblin/ice monster/jabberwock/kestrel/leprechaun/medusa/phantom/quagga/rattlesnake/troll/black unicorn/wraith/xeroc — balance.tsの10種(zombie/bat/thief/nymph/aquator/orc/dragon/yeti/snake/vampire)は本家26種の部分集合+1種の差異がある。

**"thief"は本家に存在しない名前**: balance.tsの`thief`(金を盗んで逃げる)は、挙動的には本家の**leprechaun**(金を盗んで消える)のリネームに相当する。`nymph`は本家と同名・同挙動(アイテムを盗んで消える)で一致している。

## 呪い(curse)の仕様 — `things.c`の`new_thing()`

呪いは**装着不可ロックだけでなく数値ペナルティも伴う**、本家の仕様:

- **武器**: 10%の確率で呪い(`o_hplus -= rnd(3)+1` — 命中/ダメージ補正が下がる)、別途5%の確率(呪いでない場合)で加護(+補正)
- **防具**: 20%の確率で呪い(`o_arm += rnd(3)+1` — Rogueは値が小さいほど硬いため、上げるほど弱化)、別途8%の確率で加護(-補正、強化)
- **指輪**(add-strength/protection/add-hit/add-damage系): `rnd(3)`が0なら呪い(効果値-1)、そうでなければ+1/+2
- **指輪**(aggravate monster/teleport): **必ず呪い**(デメリット専用の指輪という設計そのものが本家由来)

呪われたアイテムは外せない(ロック)効果に加えて、上記の数値ペナルティが常に伴う。

## 戦闘計算 — `fight.c`

- **命中判定**(`swing()`): `1d20 + 命中補正(武器のhplus + 力によるstr_plus補正) >= (20 - 攻撃側class) - 防御側arm` で命中。**敵が未警戒(睡眠中/held中)の対象を攻撃する場合は命中補正に+4**(不意打ちボーナス。emoji-rogueの`SNEAK_ATTACK_MULTIPLIER`はダメージ3倍という別実装だが、意図(不意打ちが有利)は本家と共通)
- **ダメージ**: `dplus(武器補正) + 武器のダイスロール + add_dam[str](力によるダメージ補正)`。0未満にはならない(`max(0, damage)`)——本家は"かすり傷にもならない"ケースがあり得るが、emoji-rogueの`MIN_DAMAGE_TAKEN=1`(最低保証ダメージ)とは逆方向の設計

## ダンジョン構造の定数 — `rogue.h`

- `MAXROOMS = 9`(3×3グリッドの部屋配置、GOAL_FLOORの`10`とは無関係の本家定数)
- `AMULETLEVEL = 26`(アミュレットのある最深階。emoji-rogueの`GOAL_FLOOR = 10`は明確な短縮版)
- `MAXPACK = 26`(持ち物所持上限。a〜zのレター選択と1:1対応させた設計。emoji-rogueの`INVENTORY_CAPACITY = 20`は明記の通りシレン初代のどうぐ袋基準を採用したもので、本家準拠ではない)

## アイテム表(`extern.c`の`*_info[]`)

出現率は各カテゴリ内での重み(数値が大きいほど出やすい)。金貨価値は本家の店売り値(emoji-rogueに店は無いので参考情報)。

### 防具8種(`arm_info`、`a_class`がAC。**値が小さいほど硬い**)

| 名前 | 出現重み | 金貨価値 | AC |
|---|---|---|---|
| leather armor | 20 | 20 | 8 |
| ring mail | 15 | 25 | 7 |
| studded leather armor | 15 | 20 | 7 |
| scale mail | 13 | 30 | 6 |
| chain mail | 12 | 75 | 5 |
| splint mail | 10 | 80 | 4 |
| banded mail | 10 | 90 | 4 |
| plate mail | 5 | 150 | 3 |

emoji-rogueは防具を単一種(`ARMOR_DEFENSE_BONUS=1`固定)に単純化済み——本家は8段階の防具種別+個体強化値の二重構造。

### 武器9種(`weap_info`+`init_dam`、ダメージは装備時/投擲時)

| 名前 | 出現重み | 金貨価値 | 装備時ダメージ | 投擲時ダメージ |
|---|---|---|---|---|
| mace | 11 | 8 | 2x4 | 1x3 |
| long sword | 11 | 15 | 3x4 | 1x2 |
| short bow | 12 | 15 | 1x1 | 1x1 |
| arrow | 12 | 1 | 1x1 | 2x3 |
| dagger | 8 | 3 | 1x6 | 1x4 |
| two handed sword | 10 | 75 | 4x4 | 1x2 |
| dart | 12 | 2 | 1x1 | 1x3 |
| shuriken | 12 | 5 | 1x2 | 2x4 |
| spear | 12 | 5 | 2x3 | 1x6 |

emoji-rogueは剣1種(`SWORD_ATTACK_BONUS=1`固定)に単純化——本家は9種の武器種別(弓矢のような投擲専用武器も含む)+個体強化値の二重構造。

### 薬14種(`pot_info`)

confusion / hallucination / poison / gain strength / see invisible / healing / monster detection / magic detection / raise level / extra healing / haste self / restore strength / blindness / levitation

emoji-rogueにあるのは poison・strength(gain相当)・raise-level・detect-monster・hallucination・confusion・levitation・blind(ness)・heal(healing相当、extra healingの上位区分は無し)・**life(最大HP恒久増加)**・paralysis。うち**life(生命の薬)は本家の14種に無い**——`docs/idea-memo.md`にも記載の通りBrogue由来。本家にあってemoji-rogueに無いもの: see invisible・magic detection・extra healing(healingとの2段階区分)・haste self・restore strength(gain strengthとは別物、力を吸われた時の回復専用)

### 巻物18種(`scr_info`)

monster confusion / magic mapping / hold monster / sleep / enchant armor / identify potion / identify scroll / identify weapon / identify armor / identify ring,wand or staff / scare monster / food detection / teleportation / enchant weapon / create monster / remove curse / aggravate monsters / protect armor

emoji-rogueにあるのは teleport・mapping・identify(**カテゴリ別5種→汎用1種に統合**)・enchant-weapon・enchant-armor・protect-armor・confuse-monster・hold-monster・remove-curse。本家にあってemoji-rogueに無いもの: sleep・scare monster・food detection・create monster・aggravate monsters(巻物版、指輪の`aggravate-monster`とは別物)

### 指輪14種(`ring_info`)

protection / add strength / sustain strength / searching / see invisible / adornment / aggravate monster / dexterity / increase damage / regeneration / slow digestion / teleportation / stealth / maintain armor

emoji-rogueにあるのは regeneration・sustenance(slow digestion相当)・stealth・aggravate-monster・**awareness**(本家14種のどれとも明確に一致しない——「searching」の言い換えである可能性が高いが未確認)。本家にあってemoji-rogueに無いもの: protection・add strength・sustain strength・see invisible・adornment・dexterity・increase damage・teleportation(指輪版)・maintain armor(防具の錆防止——emoji-rogueは同じ効果を巻物(`protect-armor`)側だけで持つ)

### 杖/魔法棒14種(`ws_info`)

light / invisibility / lightning / fire / cold / polymorph / magic missile / haste monster / slow monster / drain life / nothing / teleport away / teleport to / cancellation

emoji-rogueにあるのは **striking**(本家のこの14種に無い——NetHack由来の可能性)・teleport・magic-missile・**sleep**(本家は巻物のみで杖形態が無い)・slow(monster相当)。本家にあってemoji-rogueに無いもの: light・invisibility・lightning・fire・cold・polymorph・drain life・nothing(ハズレ枠)・teleport to(teleport awayとは別方向)・cancellation

## emoji-rogueに存在せず、本家にも存在しない要素(不思議のダンジョン由来と確認)

ソース全文を確認した範囲で、以下は本家Rogue 5.4のどこにも実装が見当たらない——`docs/idea-memo.md`が「シレン由来」と明記している通り、**本家に一切の precedent がない、完全な移植要素**:

- **クロンの風**(フロア滞在ターン数による強制排出、`WINDS_OF_KRON_*`)
- **モンスターハウス**(部屋単位の大量湧き、`MONSTER_HOUSE_*`)

この2つは`docs/tasks/game.md`のバックログで「削除対象」として扱う。

## 参考: 本家との差分で追加検討の余地があるもの(削除対象ではなく、任意の検討事項)

以下はシレン由来ではないが、本家との忠実度という観点では差分として見つかったもの。**今回の「シレン由来要素の削除」の対象ではない**——別途方針判断が要る場合の材料として記録するのみ:

- M81で「呪い=数値ペナルティ廃止、ロックのみ」に変更した経緯があるが、本家の呪いは数値ペナルティを伴うのが仕様
- `INVENTORY_CAPACITY = 20`は本家の`MAXPACK = 26`と異なる(シレン基準採用の明記あり)
- `thief`は本家に存在せず、`leprechaun`のリネーム相当
- **生命の薬(life potion)は本家の薬14種に存在しない**——`docs/idea-memo.md`にも記載の通りBrogue由来。シレン由来ではないため今回の削除方針の対象外だが、忠実度観点では同じ性質の差分
- **杖の「striking」は本家の杖14種に存在しない**——出どころ不明(NetHack等の可能性)
- 武器・防具は本家がそれぞれ9種/8種の個別アイテムを持つのに対し、emoji-rogueは各1種+個体強化値に単純化されている(規模を抑える意図的な簡略化であり、本家不在という意味での「移植要素」ではない)
