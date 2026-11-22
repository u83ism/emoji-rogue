import { UNARMORED_ARMOR_CLASS } from "../../game/balance.js";
import type { DamageDice } from "../../game/combat/damage.js";
import {
	ARMOR_KIND_VALUES,
	type ArmorKind,
	WEAPON_KIND_VALUES,
} from "../../game/events.js";
import {
	ARMOR_STATS,
	WEAPON_STATS,
} from "../../game/items/equipment/equipmentKinds.js";
import { ARMOR_WORTH } from "../../game/score.js";
import { EQUIPMENT_NAMES } from "../gameNames.js";

// The catalog's weapon and armor sections (catalog.ts assembles the whole
// page) — split out once catalog.ts reached the 200-line structure limit.

const formatDice = (dice: DamageDice): string => `${dice.count}d${dice.sides}`;

/** "出現比" as a percentage of the kinds' combined spawn weight. */
const formatSpawnShare = (weight: number, totalWeight: number): string =>
	`${Math.round((weight * 100) / totalWeight)}%`;

/**
 * Original Rogue's armor table gives some kinds the same AC (ring mail and
 * studded leather, splint and banded mail), differing only in what they
 * sell for at a win (score.ts). The later-listed one of such a pair says so.
 */
const formatArmorNote = (kind: ArmorKind): string => {
	const index = ARMOR_KIND_VALUES.indexOf(kind);
	const twin = ARMOR_KIND_VALUES.slice(0, index).find(
		(earlier) =>
			ARMOR_STATS[earlier].armorClass === ARMOR_STATS[kind].armorClass,
	);
	if (twin === undefined) {
		return "";
	}
	const worthDifference = ARMOR_WORTH[kind] - ARMOR_WORTH[twin];
	const scoreNote =
		worthDifference > 0
			? "持ち帰り時のスコアが高い"
			: worthDifference < 0
				? "持ち帰り時のスコアが低い"
				: "持ち帰り時のスコアも同じ";
	return `性能は${EQUIPMENT_NAMES[twin]}と同じ。${scoreNote}`;
};

export const buildEquipmentSection = (): string => {
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
		return `| ${EQUIPMENT_NAMES[kind]} | ${UNARMORED_ARMOR_CLASS - armorClass} | ${armorClass} | ${formatSpawnShare(spawnWeight, armorWeight)} | ${formatArmorNote(kind)} |`;
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
		"| 名前 | 防御力 | AC | 出現比 | 備考 |",
		"|---|---|---|---|---|",
		...armorRows,
	].join("\n");
};
