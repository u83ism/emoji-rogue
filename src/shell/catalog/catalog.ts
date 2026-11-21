import {
	NOT_RUNNING_HIT_BONUS,
	ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD,
	ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD,
	ROOM_GOLD_CHANCE_PERCENT,
	UNARMORED_ARMOR_CLASS,
} from "../../game/balance.js";
import type { DamageDice } from "../../game/combat/damage.js";
import {
	ENEMY_HP_DICE_SIDES,
	ENEMY_STATS,
} from "../../game/enemies/enemyStats.js";
import { ENEMY_GLYPHS } from "../../game/enemyGlyphs.js";
import {
	ARMOR_KIND_VALUES,
	ENEMY_KIND_VALUES,
	ITEM_KIND_VALUES,
	TRAP_KIND_VALUES,
	WEAPON_KIND_VALUES,
} from "../../game/events.js";
import { calculateEnemyFloorRange } from "../../game/floor/enemies.js";
import { ITEM_GLYPHS } from "../../game/glyphs.js";
import {
	ARMOR_STATS,
	WEAPON_STATS,
} from "../../game/items/equipment/equipmentKinds.js";
import {
	ENEMY_NAMES,
	EQUIPMENT_NAMES,
	resolveItemDisplayName,
	TRAP_NAMES,
} from "../gameNames.js";
import {
	type ItemCategory,
	type SpawnInfo,
	TRAP_CATALOG,
} from "./catalogData.js";
import { ENEMY_BEHAVIOR } from "./enemyCatalog.js";
import { ITEM_CATALOG } from "./itemCatalog.js";

// Builds docs/catalog.md from the same tables the game runs on (balance.ts,
// glyphs.ts, gameNames.ts, catalogData.ts). Freshness is enforced by
// catalog.test.ts: the committed file must equal this function's output, so
// forgetting to regenerate after a balance change fails `npm test`.
// Regenerate with `npm run docs:catalog`.

const CATEGORY_ORDER: readonly ItemCategory[] = [
	"薬",
	"巻物",
	"杖",
	"指輪",
	"装備",
	"食料",
];

const formatSpawn = (spawn: SpawnInfo): string => {
	switch (spawn.type) {
		case "guaranteed":
			return `確定${spawn.countPerFloor}個/フロア`;
		case "chance":
			return `${spawn.percent}%/フロア`;
		case "share":
			return `アイテム1個の${spawn.percent.toFixed(1)}%`;
		case "described":
			return spawn.description;
	}
};

/** "1d8/1d8/3d10" — one die per attack; a 0-count die (a hit that deals no damage) prints as "0". */
const formatAttacks = (attacks: readonly DamageDice[]): string =>
	attacks
		.map((dice) => (dice.count === 0 ? "0" : `${dice.count}d${dice.sides}`))
		.join("/");

const formatFloorRange = (kind: (typeof ENEMY_KIND_VALUES)[number]): string => {
	const { firstFloor, lastFloor } = calculateEnemyFloorRange(kind);
	return lastFloor === undefined
		? `${firstFloor}階以降`
		: `${firstFloor}〜${lastFloor}階`;
};

const buildEnemySection = (): string => {
	const rows = ENEMY_KIND_VALUES.map((kind) => {
		const stats = ENEMY_STATS[kind];
		return `| ${ENEMY_GLYPHS[kind].glyph} | ${ENEMY_NAMES[kind]} | ${stats.level} | ${stats.armorClass} | ${formatAttacks(stats.attacks)} | ${stats.experience} | ${formatFloorRange(kind)} | ${ENEMY_BEHAVIOR[kind]} |`;
	});
	return [
		"## 敵一覧",
		"",
		`能力値は原作Rogue 5.4の表そのまま。HPは個体ごとに「レベル」個の${ENEMY_HP_DICE_SIDES}面ダイスで決まる。ACは小さいほど攻撃が当たりにくい。攻撃は「/」で区切った数だけ1ターンに命中判定があり、当たった分だけダイスのダメージを受ける(防具は当たりにくくするだけで、ダメージは減らさない)。経験値は表の値に、その個体のHPに応じた加算が付く。`,
		"",
		`各部屋には${ROOM_GOLD_CHANCE_PERCENT}%で金貨の山が1つ置かれ、金貨のある部屋は${ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD}%・ない部屋は${ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD}%で敵が1体配置される。種類は階が深くなるほど強いものに入れ替わる。これとは別に、約70ターン経つと4ターンごとに1/6の確率で、徘徊する敵が見えない場所に起きた状態で現れる(現れるとまた約70ターン待つ。イッキーシング・盗賊・ニンフ・ハエトリソウ・ゼロック・ドラゴンは徘徊しない)。部屋の敵は眠った状態で出現し、隣接または視界内で毎ターン確率で目を覚ます。ドラゴン・ニンフは必ず、ジャバウォック70%・トロル50%・メデューサ40%・ゼロックと雪男30%・グリフィンとヴァンパイア20%・ケンタウロスとオーク15%の確率で、部屋に置かれたときに持ち物を1つ持っていて(これまでで最も深い階のときだけ)、倒すとその場に落とす。プレイヤーが凍らされる・眠らされる・空腹の段階が変わると、次に動けなくなった状態から回復するまで、敵の攻撃が命中判定に+${NOT_RUNNING_HIT_BONUS}される(ゲーム開始時も同じ。本家5.4のISRUNの扱いそのまま)。`,
		"",
		"| 絵文字 | 名前 | レベル | AC | 攻撃 | 経験値 | 出現階 | 習性 |",
		"|---|---|---|---|---|---|---|---|",
		...rows,
	].join("\n");
};

const buildItemSection = (): string => {
	const rows = CATEGORY_ORDER.flatMap((category) =>
		ITEM_KIND_VALUES.filter(
			(kind) => ITEM_CATALOG[kind].category === category,
		).map((kind) => {
			const entry = ITEM_CATALOG[kind];
			return `| ${ITEM_GLYPHS[kind].glyph} | ${entry.catalogName} | ${entry.category} | ${resolveItemDisplayName(kind, [])} | ${formatSpawn(entry.spawn)} | ${entry.effect} |`;
		}),
	);
	return [
		"## アイテム一覧",
		"",
		"「拾った時の表示」が名前と違うものは、使う(または識別する)まで正体が分からない。薬は種類単位の鑑定制で、一度正体が判明すればそのランでは以後実名表示になる。",
		"",
		"| 絵文字 | 名前 | 分類 | 拾った時の表示 | 出現 | 効果 |",
		"|---|---|---|---|---|---|",
		...rows,
	].join("\n");
};

const formatDice = (dice: DamageDice): string => `${dice.count}d${dice.sides}`;

/** "出現比" as a percentage of the kinds' combined spawn weight. */
const formatSpawnShare = (weight: number, totalWeight: number): string =>
	`${Math.round((weight * 100) / totalWeight)}%`;

const buildEquipmentSection = (): string => {
	const weaponWeight = WEAPON_KIND_VALUES.reduce(
		(sum, kind) => sum + WEAPON_STATS[kind].spawnWeight,
		0,
	);
	const armorWeight = ARMOR_KIND_VALUES.reduce(
		(sum, kind) => sum + ARMOR_STATS[kind].spawnWeight,
		0,
	);
	const weaponRows = WEAPON_KIND_VALUES.map((kind) => {
		const { damageDice, hurlDice, launcher, stackMin, stackMax, spawnWeight } =
			WEAPON_STATS[kind];
		const hurl =
			launcher === undefined
				? formatDice(hurlDice)
				: `${formatDice(hurlDice)}(${EQUIPMENT_NAMES[launcher]}を装備中のみ。なければ${formatDice(damageDice)})`;
		const stack = stackMax > 1 ? `${stackMin}〜${stackMax}本` : "1本";
		return `| ${EQUIPMENT_NAMES[kind]} | ${formatDice(damageDice)} | ${hurl} | ${stack} | ${formatSpawnShare(spawnWeight, weaponWeight)} |`;
	});
	const armorRows = ARMOR_KIND_VALUES.map((kind) => {
		const { armorClass, spawnWeight } = ARMOR_STATS[kind];
		return `| ${EQUIPMENT_NAMES[kind]} | ${UNARMORED_ARMOR_CLASS - armorClass} | ${armorClass} | ${formatSpawnShare(spawnWeight, armorWeight)} |`;
	});
	return [
		"## 武器の種類",
		"",
		"原作Rogue 5.4の武器9種。「装備」はその武器で殴ったとき、「投擲」は持ち物から投げたとき(選んだ方向へ飛び、最初に当たった敵に当たる)のダイス(素手は1d4)。装備中の武器は投げられない。投げた武器は当たれば失われ、外れれば敵の近くに落ちる。「1回で拾える数」が複数のものは1枠に束ねて持てる。「出現比」は拾った武器がその種類である割合。冒険は命中+1・ダメージ+1のメイスを装備し、命中+1の弓と矢25〜39本を持って始まる。",
		"",
		"| 名前 | 装備 | 投擲 | 1回で拾える数 | 出現比 |",
		"|---|---|---|---|---|",
		...weaponRows,
		"",
		"## 防具の種類",
		"",
		`原作Rogue 5.4の防具8種。防御力は「${UNARMORED_ARMOR_CLASS}−AC」で、1点ごとに敵の命中率が5ポイント下がる。革鎧だけは錆びない。冒険は防御力+1のリングメイルを装備して始まる。`,
		"",
		"| 名前 | 防御力 | AC | 出現比 |",
		"|---|---|---|---|",
		...armorRows,
	].join("\n");
};

const buildTrapSection = (): string => {
	const rows = TRAP_KIND_VALUES.map((kind) => {
		const entry = TRAP_CATALOG[kind];
		return `| ${TRAP_NAMES[kind]} | ${formatSpawn(entry.spawn)} | ${entry.effect} |`;
	});
	return [
		"## わな一覧",
		"",
		"わなは踏むまで見えず、一度発動すると消える。浮遊中はどのわなも発動しない。部屋の内側(出入り口から離れたマス)にだけ配置される。",
		"",
		"| 名前 | 出現 | 効果 |",
		"|---|---|---|",
		...rows,
	].join("\n");
};

/** The complete docs/catalog.md content — see the header comment for the freshness contract. */
export const buildCatalogMarkdown = (): string =>
	[
		"# emoji-rogue カタログ(敵・アイテム・わな)",
		"",
		"<!-- GENERATED by scripts/generate-catalog.ts — 手で編集しない。更新は `npm run docs:catalog`(catalog.test.tsが鮮度を強制する) -->",
		"",
		buildEnemySection(),
		"",
		buildItemSection(),
		"",
		buildEquipmentSection(),
		"",
		buildTrapSection(),
		"",
	].join("\n");
