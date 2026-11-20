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

**emoji-rogueの26種との名前の対応(2026-11-12更新)**: マイルストーン101〜103で26種まで実装したが、本家5.4と名前が一致しないものが4種ある——`thief`(本家L=leprechaun)、`rat`(本家R=rattlesnake)、`ur-vile`(本家U=black unicorn)、`icky-thing`(本家I=ice monster)。残り22種は本家と同名。`rat`・`ur-vile`・`icky-thing`は能力も本家5.4の該当モンスターと照合していない。

**"thief"は本家に存在しない名前**: `thief`(金を盗んで逃げる)は本家の**leprechaun**に相当する。名前は「盗賊」のままアレンジとして残し、挙動だけ本家に合わせた(2026-11-12本人決定、マイルストーン110)。`nymph`は本家と同名・同挙動(アイテムを盗んで消える)で一致している。

**leprechaunの挙動**(`fight.c`の`attack()`と`killed()`、`rogue.h`の`GOLDCALC`、`monsters.c`の`save_throw()`):

- 攻撃が当たると所持金から`GOLDCALC`(=`rnd(50 + 10 * level) + 2`。フロアに落ちている金貨の山1つと同じ式で、階が深いほど大きい)を奪う。`save(VS_MAGIC)`に失敗すると、さらに`GOLDCALC`4回分を奪う(合計5回分)。所持金は0未満にならない。奪った後、その場から消える
- 倒すと金貨を落とす: `GOLDCALC`1回分、`save(VS_MAGIC)`に成功するとさらに4回分。ただし**最深到達階にいるとき(`level >= max_level`)だけ**
- `save(VS_MAGIC)`: d20の出目が`14 + 3 - プレイヤーレベル/2`(切り捨て)以上で成功。レベル1なら17以上=20%。protectionの指輪は目標値を下げる
- emoji-rogueの対応: 金貨の山1つ分は本家の`GOLDCALC`(2〜51+階×10)そのもの。最深到達階の条件もマイルストーン115で実装した(`GameState.deepestFloor`)

## 呪い(curse)の仕様 — `things.c`の`new_thing()`

呪いは**装着不可ロックだけでなく数値ペナルティも伴う**、本家の仕様:

- **武器**: 10%の確率で呪い(`o_hplus -= rnd(3)+1` — **命中補正だけ**が1〜3下がる。ダメージ補正`o_dplus`は変わらない)、別途5%の確率(呪いでない場合)で命中補正が1〜3上がる
- **防具**: 20%の確率で呪い(`o_arm += rnd(3)+1` — Rogueは値が小さいほど硬いため、上げるほど弱化)、別途8%の確率で1〜3強化
- **指輪**(add-strength/protection/add-hit/add-damage系): `rnd(3)`が0なら呪い(効果値-1)、そうでなければ+1/+2
- **指輪**(aggravate monster/teleport): **必ず呪い**(デメリット専用の指輪という設計そのものが本家由来)

呪われたアイテムは外せない(ロック、`things.c`の`dropcheck()`)効果に加えて、上記の数値ペナルティが常に伴う。上に挙げた以外の指輪(regeneration・slow digestion・stealth・searchingなど)は呪われない。

**呪いが解ける条件**(`scrolls.c`): remove curseの巻物は装備中の武器・防具・左右の指輪の呪いを解く。**enchant weapon・enchant armorの巻物も、装備中の武器/防具の呪いを解く**(強化と同時に`ISCURSED`を落とす)。

**emoji-rogueの対応(マイルストーン110・111)**: 武器・防具の抽選と確率、指輪の「警報(aggravate monster)だけ必ず呪い」は本家どおり。武器の呪い/強化は命中補正(`hitBonus`)だけを動かし、強化の巻物は呪いも解く(マイルストーン111で対応)。残る差分は1つ——強化の巻物の対象を持ち物から選べること(本家は装備中のものに効く)。

## 戦闘計算 — `fight.c`

- **命中判定**(`swing()`): `1d20 + 命中補正(武器のhplus + 力によるstr_plus補正) >= (20 - 攻撃側class) - 防御側arm` で命中。**敵が未警戒(睡眠中/held中)の対象を攻撃する場合は命中補正に+4**(不意打ちボーナス。emoji-rogueの`SNEAK_ATTACK_MULTIPLIER`はダメージ3倍という別実装だが、意図(不意打ちが有利)は本家と共通)
- **ダメージ**: `dplus(武器補正) + 武器のダイスロール + add_dam[str](力によるダメージ補正)`。0未満にはならない(`max(0, damage)`)。防具(AC)は命中判定にだけ効き、ダメージは減らさない
- **モンスターの攻撃**: `monsters[]`のダメージ欄(例: ドラゴン`1x8/1x8/3x10`)は「/」区切りの1つずつが別々の命中判定+ダメージ。HPは`roll(レベル, 8)`、経験値は表の値+`exp_add()`(最大HPの1/8〜1/6、レベル7以上は×4、10以上は×20)
- **プレイヤーの成長**(`check_level()`、`extern.c`の`e_levels[]`・`INIT_STATS`): HP12・力16・AC10・素手1d4で開始。経験値10/20/40/…でレベルが上がり、1レベルごとに最大HP+1d10
- **自然回復**(`daemons.c`の`doctor()`): 戦闘のないターン数`quiet`を数え、レベル7以下は`quiet + レベル×2 > 20`で1回復、レベル8以上は3ターンごとに`rnd(レベル-7)+1`回復。再生の指輪は毎ターン+1。回復すると`quiet`は0に戻る。`quiet`は自分が攻撃したとき・攻撃されたときにも0に戻る(`fight.c`)
- **敵の出現**(`monsters.c`の`randmonster()`・`lvl_mons[]`): 26種を弱い順に並べた表から「階 + rnd(10) - 6」番目を引く(表の外に出たら先頭5種/末尾5種から引き直す)。部屋ごとに、金貨のある部屋は80%・ない部屋は25%で1体
- **emoji-rogueの対応(マイルストーン111、2026-11-16)**: 上の命中判定・ダメージ・モンスターの攻撃・成長・自然回復・出現の表引きを本家どおりに実装した。差分: 力のステータスが無く、怪力の薬は常にダメージ+1(本家は力16→17でダメージ+0・命中+1など表引き)。不意打ちは必中+ダメージ3倍のまま(本家は命中+4のみ)。部屋ごとの金貨(50%)と出現率(80%/25%)はマイルストーン115で本家どおりにした。徘徊モンスター(`daemons.c`の`swander()`/`rollwand()`、`monsters.c`の`wanderer()`: 約70ターン(`spread(70)`=67〜73)待ってから4ターンごとに1/6で1体、出たら待ち直し。プレイヤーのいる部屋以外に、起きた状態で出る。ice monster・leprechaun・nymph・venus flytrap・xeroc・dragonは徘徊しない)はマイルストーン114で実装した——出現場所は「プレイヤーから見えていない床」で代用している(部屋の情報を`GameState`に持っていないため)。ハエトリソウの拘束ダメージ(`fight.c`の`vf_hit`: 命中のたびに1増え、外れたターンもその値を受ける)、コウモリ・ファントムの不規則な動き(`chase.c`の`chase()`: コウモリ1/2・ファントム1/5でランダムな1歩)、飛ぶ敵(`ISFLY`: コウモリ・ケストレル・グリフィン)の、プレイヤーから離れている間の2回行動(`runners()`)はマイルストーン115で実装した。イッキーシング(本家の位置はice monster)は1d2の攻撃を持つ(本家のice monsterは0x0で、代わりに凍らせる)

## わな — `move.c`の`be_trapped()`

- 矢(`T_ARROW`): `swing(レベル-1, AC, 1)`で命中すると1d6、外れると矢が足元に落ちる
- ダーツ(`T_DART`): `swing(レベル+1, AC, 1)`で命中すると1d4、さらに`save(VS_POISON)`に失敗すると力-1(持続の指輪で防ぐ)。外れると何も残らない
- **emoji-rogueの対応(マイルストーン115)**: emoji-rogueの「矢のわな」(内部名`dart`)は`T_DART`の命中判定と1d4にした。力のステータスが無いので力-1は無い。本家の`T_ARROW`(1d6・矢が落ちる)は未実装。本家のわなは踏んでも消えず見えるようになるが、emoji-rogueでは1回で消える(マイルストーン22からの簡略化)

## 空腹 — `daemons.c`の`stomach()`、`misc.c`の`eat()`

- `HUNGERTIME = 1300`(開始時の満腹度)、`STOMACHSIZE = 2000`(上限)、`MORETIME = 150`、`STARVETIME = 850`
- 毎ターン`1 + 左右の指輪の消費 - (魔除け所持なら1)`減る。300未満で"Hungry"、150未満で"Weak"
- 0以下になると数値は負に進み、動ける状態なら毎ターン1/5で`rnd(8)+4`ターン気絶。`-850`を下回ると餓死
- 食料を食べると(負なら0に戻してから)`HUNGERTIME - 200 + rnd(400)`増える
- 指輪の消費(`rings.c`の`ring_eat()`): regenerationは2、protection・add strength・sustain strength・stealth・maintain armorは1、searching・add hit・add damageは1/3の確率で1、see invisibleは1/5の確率で1、slow digestionは1/2の確率で-1、aggravate monster・teleportationは0
- 食料の出方(`things.c`の`new_thing()`、`new_level.c`): 1階につき9回、各36%でアイテムが出て、その16%が食料。階を作るたびに`no_food`を1増やし、3を超えていれば次に出るアイテムは必ず食料
- **emoji-rogueの対応(マイルストーン112、2026-11-16)**: 上の数値と挙動を実装した。差分: 魔除け所持での消費軽減は無い。食料は他のアイテムと独立に抽選する(1回5.76%×9回)。Weak段階にダメージ-1のペナルティがある(本家のWeakに数値上の効果があるかは未確認)

## ダンジョン構造の定数 — `rogue.h`

- `MAXROOMS = 9`(3×3グリッドの部屋配置、GOAL_FLOORの`10`とは無関係の本家定数)
- `AMULETLEVEL = 26`(アミュレットのある最深階。emoji-rogueの`GOAL_FLOOR`もマイルストーン111で26にした)
- `MAXPACK = 26`(持ち物所持上限。a〜zのレター選択と1:1対応させた設計。`pack.c`の`pack_room()`は薬・巻物・食料を重ねて持っても1個ずつ数える——矢のような「束」だけが束で1つ。emoji-rogueの`INVENTORY_CAPACITY`もマイルストーン110で26にした。1個=1スロットなので数え方も一致)

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

emoji-rogueもマイルストーン111でこの8種を実装した(`src/game/items/equipmentKinds.ts`)。錆び(`rust_armor()`)は本家どおり革鎧には効かず、ACが9に達すると止まる。

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

emoji-rogueはマイルストーン111で近接5種(mace・long sword・dagger・two handed sword・spear)を実装した。short bow・arrow・dart・shurikenは「投げる」コマンドが無いので未実装。出現重みは5種だけで按分している。本家の初期装備(`init.c`の`init_player()`)はメイス+1/+1・リングメイル+1・食料1・弓+1・矢で、emoji-rogueは弓矢以外を持って始まる。

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

以下はシレン由来ではないが、本家との忠実度という観点では差分として見つかったもの。2026-11-20に「ゲームのルールとバランスは本家のまま」という建て付けが明言されたため(`docs/design.md`のコンセプト方針)、**盗賊の名前以外はすべて本家に合わせる対象**:

- (解決済み、マイルストーン110)呪いの数値ペナルティ・持ち物上限26・盗賊の挙動は本家準拠にした。盗賊の名前だけはアレンジとして残す。残った細かい差分は各節の「emoji-rogueの対応」と`docs/tasks/game.md`のバックログを参照
- `rat`・`ur-vile`・`icky-thing`は本家5.4の26種に無い名前(本家はrattlesnake・black unicorn・ice monster)
- **生命の薬(life potion)は本家の薬14種に存在しない**——`docs/idea-memo.md`にも記載の通りBrogue由来。シレン由来ではないため今回の削除方針の対象外だが、忠実度観点では同じ性質の差分
- **杖の「striking」は本家の杖14種に存在しない**——出どころ不明(NetHack等の可能性)
- (解決済み、マイルストーン111)武器は近接5種・防具は8種を本家の数値で実装し、戦闘の数値スケール全体(敵の能力値・プレイヤーHP・命中式・26階)を本家に合わせた。残った差分は「戦闘計算」節の「emoji-rogueの対応」に記載
