import {
	AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT,
	AWARENESS_RING_SPAWN_CHANCE_PERCENT,
	REGENERATION_RING_FOOD_COST,
	RING_REGEN_AMOUNT,
	RING_SPAWN_CHANCE_PERCENT,
	STEALTH_RING_FOOD_COST,
	STEALTH_RING_SPAWN_CHANCE_PERCENT,
	STEALTH_RING_WAKE_CHANCE_PERCENT,
	SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	WAKE_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { ItemCatalogEntry } from "./catalogData.js";

// The ring rows of the item catalog — composed into ITEM_CATALOG in
// itemCatalog.ts, split out once that file passed the 200-line
// structure-lint limit (milestone 95 follow-up). Same rules as
// catalogData.ts: numbers always interpolated from balance.ts.

type RingKind =
	| "regeneration-ring"
	| "sustenance-ring"
	| "stealth-ring"
	| "awareness-ring"
	| "aggravate-monster-ring";

export const RING_CATALOG: Readonly<Record<RingKind, ItemCatalogEntry>> = {
	"regeneration-ring": {
		catalogName: "再生の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、毎ターンHPが${RING_REGEN_AMOUNT}回復する代わりに、満腹度の減りが毎ターン${REGENERATION_RING_FOOD_COST}増える(外すと効果も消える)`,
	},
	"sustenance-ring": {
		catalogName: "満腹の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、毎ターン${SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT}%で満腹度が減らない(外すと効果も消える。空腹で倒れている間は効かない)`,
	},
	"stealth-ring": {
		catalogName: "隠密の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: STEALTH_RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、敵の毎ターンの目覚め確率が${WAKE_CHANCE_PERCENT}%から${STEALTH_RING_WAKE_CHANCE_PERCENT}%に下がる代わりに、満腹度の減りが毎ターン${STEALTH_RING_FOOD_COST}増える(外すと効果も消える)`,
	},
	"awareness-ring": {
		catalogName: "千里眼の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: AWARENESS_RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、視界外・未探索領域を含め常に敵の位置を感知する(索敵の薬の恒久版、外すと効果も消える)`,
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
};
