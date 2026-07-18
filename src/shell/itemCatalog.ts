import {
	ENCHANT_ARMOR_BONUS,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_BONUS,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	FOOD_COUNT_PER_FLOOR,
	FOOD_RATION_RESTORE_AMOUNT,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	MIN_PLAYER_ATTACK_DAMAGE,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	RING_REGEN_CHANCE_PERCENT,
	RING_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
	SHIELD_CURSE_CHANCE_PERCENT,
	SHIELD_DEFENSE_BONUS,
	SHIELD_SPAWN_CHANCE_PERCENT,
	SLOW_WAND_DURATION,
	SLOW_WAND_SPAWN_CHANCE_PERCENT,
	SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	SWORD_ATTACK_BONUS,
	SWORD_CURSE_CHANCE_PERCENT,
	SWORD_SPAWN_CHANCE_PERCENT,
	WAND_SPAWN_CHANCE_PERCENT,
	WAND_STRIKE_DAMAGE,
} from "../game/balance.js";
import type { ItemKind } from "../game/events.js";
import type { ItemCatalogEntry } from "./catalogData.js";
import { POTION_CATALOG } from "./potionCatalog.js";

// The non-potion rows of the item catalog, composed with POTION_CATALOG into
// the full Record<ItemKind, ...> — the annotation makes a kind missing from
// both halves a compile error. Same rules as catalogData.ts: numbers always
// interpolated from balance.ts.

export const ITEM_CATALOG: Readonly<Record<ItemKind, ItemCatalogEntry>> = {
	...POTION_CATALOG,
	"teleport-scroll": {
		catalogName: "テレポートの巻物",
		category: "巻物",
		spawn: { type: "chance", percent: SCROLL_SPAWN_CHANCE_PERCENT },
		effect: "フロア内のランダムな床へ瞬間移動する",
	},
	"mapping-scroll": {
		catalogName: "地図の巻物",
		category: "巻物",
		spawn: { type: "chance", percent: MAPPING_SCROLL_SPAWN_CHANCE_PERCENT },
		effect: "フロア全体の地形が既踏破になる",
	},
	"identify-scroll": {
		catalogName: "識別の巻物",
		category: "巻物",
		spawn: { type: "chance", percent: IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT },
		effect: "未鑑定のポーション1種の正体が判明する(固定順)",
	},
	"enchant-weapon": {
		catalogName: "武器強化の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `攻撃力が${ENCHANT_WEAPON_BONUS}恒久的に上がる。呪いなし`,
	},
	"enchant-armor": {
		catalogName: "防具強化の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `防御力が${ENCHANT_ARMOR_BONUS}恒久的に上がる。呪いなし`,
	},
	"protect-armor": {
		catalogName: "防具保護の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: "防具が錆びなくなる(アクエーターの錆攻撃を無効化)",
	},
	"striking-wand": {
		catalogName: "攻撃の杖",
		category: "杖",
		spawn: { type: "chance", percent: WAND_SPAWN_CHANCE_PERCENT },
		effect: `視界内の最も近い敵に${WAND_STRIKE_DAMAGE}ダメージ。1回使い切り`,
	},
	"slow-wand": {
		catalogName: "鈍足の杖",
		category: "杖",
		spawn: { type: "chance", percent: SLOW_WAND_SPAWN_CHANCE_PERCENT },
		effect: `視界内の最も近い敵を${SLOW_WAND_DURATION}ターン行動不能にする。1回使い切り`,
	},
	"regeneration-ring": {
		catalogName: "再生の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: RING_SPAWN_CHANCE_PERCENT },
		effect: `身につけると毎ターン${RING_REGEN_CHANCE_PERCENT}%でHPが1回復するようになる(永続)`,
	},
	"sustenance-ring": {
		catalogName: "満腹の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT },
		effect: `身につけると毎ターン${SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT}%で空腹の進行が止まるようになる(永続)`,
	},
	sword: {
		catalogName: "剣",
		category: "装備",
		spawn: { type: "chance", percent: SWORD_SPAWN_CHANCE_PERCENT },
		effect: `攻撃力が${SWORD_ATTACK_BONUS}恒久的に上がる。${SWORD_CURSE_CHANCE_PERCENT}%で呪われており逆に下がる(下限${MIN_PLAYER_ATTACK_DAMAGE})`,
	},
	shield: {
		catalogName: "盾",
		category: "装備",
		spawn: { type: "chance", percent: SHIELD_SPAWN_CHANCE_PERCENT },
		effect: `防御力が${SHIELD_DEFENSE_BONUS}恒久的に上がる。${SHIELD_CURSE_CHANCE_PERCENT}%で呪われており逆に下がる(負にもなる)`,
	},
	food: {
		catalogName: "食料",
		category: "食料",
		spawn: { type: "guaranteed", countPerFloor: FOOD_COUNT_PER_FLOOR },
		effect: `満腹度を${FOOD_RATION_RESTORE_AMOUNT}回復する`,
	},
};
