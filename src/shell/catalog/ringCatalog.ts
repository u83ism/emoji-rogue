import {
	AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT,
	OTHER_RING_SPAWN_CHANCE_PERCENT,
	RING_FOOD_USE,
	RING_REGEN_AMOUNT,
	RING_SPAWN_CHANCE_PERCENT,
	STEALTH_RING_SPAWN_CHANCE_PERCENT,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	TELEPORTATION_RING_CHANCE_DENOMINATOR,
	WAKE_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { RingKind } from "../../game/events.js";
import type { ItemCatalogEntry } from "./catalogData.js";

const otherRingSpawn = {
	type: "chance",
	percent: OTHER_RING_SPAWN_CHANCE_PERCENT,
} as const;

/** The value roll every valued ring shares (original Rogue's new_thing()). */
const VALUED_RING_NOTE = "値は+1か+2で、1/3の確率で-1になり呪われている";

// The ring rows of the item catalog — composed into ITEM_CATALOG in
// itemCatalog.ts, split out once that file passed the 200-line
// structure-lint limit (milestone 95 follow-up). Same rules as
// catalogData.ts: numbers always interpolated from balance.ts.

export const RING_CATALOG: Readonly<Record<RingKind, ItemCatalogEntry>> = {
	"regeneration-ring": {
		catalogName: "再生の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、毎ターンHPが${RING_REGEN_AMOUNT}回復する代わりに、満腹度の減りが毎ターン${RING_FOOD_USE["regeneration-ring"]}増える(外すと効果も消える)`,
	},
	"sustenance-ring": {
		catalogName: "満腹の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT },
		effect:
			"装備している間、毎ターン50%で満腹度が減らない(外すと効果も消える。空腹で倒れている間は効かない)",
	},
	"stealth-ring": {
		catalogName: "隠密の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: STEALTH_RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、敵の毎ターンの目覚め確率が${WAKE_CHANCE_PERCENT}%から${STEALTH_RING_WAKE_CHANCE_PERCENT}%に下がる代わりに、満腹度の減りが毎ターン${RING_FOOD_USE["stealth-ring"]}増える(外すと効果も消える)`,
	},
	"aggravate-monster-ring": {
		catalogName: "警報の指輪",
		category: "指輪",
		spawn: {
			type: "chance",
			percent: AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT,
		},
		effect: `装備した瞬間、そのフロアの敵を全て強制的に覚醒させる「はずれ」の指輪。必ず呪われており、解呪するまで外せない`,
	},
	"protection-ring": {
		catalogName: "守りの指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: `装備している間、その値だけACが良くなる(敵の攻撃が当たりにくい)。${VALUED_RING_NOTE}。満腹度の減りが毎ターン1増える`,
	},
	"add-strength-ring": {
		catalogName: "怪力の指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: `はめるとその値だけ力が上がり、外すと戻る。${VALUED_RING_NOTE}。満腹度の減りが毎ターン1増える`,
	},
	"sustain-strength-ring": {
		catalogName: "持続の指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect:
			"装備している間、毒の薬・サソリ・矢のわなで力が下がらない。満腹度の減りが毎ターン1増える",
	},
	"adornment-ring": {
		catalogName: "飾りの指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: "何の効果も無い(本家のadornment)",
	},
	"dexterity-ring": {
		catalogName: "器用さの指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: `装備している間、武器を持って殴るときの命中がその値だけ上がる(素手・投擲には効かない)。${VALUED_RING_NOTE}。満腹度の減りは3ターンに1回ほど1増える`,
	},
	"increase-damage-ring": {
		catalogName: "ダメージの指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: `装備している間、武器を持って殴るときのダメージがその値だけ上がる(素手・投擲には効かない)。${VALUED_RING_NOTE}。満腹度の減りは3ターンに1回ほど1増える`,
	},
	"teleportation-ring": {
		catalogName: "テレポートの指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect: `装備している間、毎ターン1/${TELEPORTATION_RING_CHANCE_DENOMINATOR}の確率でフロア内のどこかへ勝手に飛ばされる。必ず呪われており、解呪するまで外せない`,
	},
	"maintain-armor-ring": {
		catalogName: "鎧の維持の指輪",
		category: "指輪",
		spawn: otherRingSpawn,
		effect:
			"装備している間、アクエーターや錆のわなで鎧が錆びない。満腹度の減りが毎ターン1増える",
	},
};
