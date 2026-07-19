import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_DEFENSE_BONUS,
	ARMOR_SPAWN_CHANCE_PERCENT,
	ENCHANT_ARMOR_BONUS,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_BONUS,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	FOOD_COUNT_PER_FLOOR,
	FOOD_RATION_RESTORE_AMOUNT,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
	RING_CURSE_CHANCE_PERCENT,
	RING_REGEN_CHANCE_PERCENT,
	RING_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
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
		effect: `所持中の剣を1つ選んで指定し、その剣の攻撃力を${ENCHANT_WEAPON_BONUS}恒久的に上げる(装備中でなくてもよい)。巻物自体に呪いはない`,
	},
	"enchant-armor": {
		catalogName: "防具強化の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `所持中の防具を1つ選んで指定し、その防具の防御力を${ENCHANT_ARMOR_BONUS}恒久的に上げる(装備中でなくてもよい)。巻物自体に呪いはない`,
	},
	"protect-armor": {
		catalogName: "防具保護の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect:
			"所持中の防具を1つ選んで指定し、錆びなくする(アクエーターの錆攻撃を無効化)",
	},
	"remove-curse-scroll": {
		catalogName: "解呪の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: "装備中で呪われている剣・防具・指輪を全て解呪する(対象選択不要)",
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
		effect: `装備している間、毎ターン${RING_REGEN_CHANCE_PERCENT}%でHPが1回復する(外すと効果も消える)。${RING_CURSE_CHANCE_PERCENT}%で呪われており外せなくなる`,
	},
	"sustenance-ring": {
		catalogName: "満腹の指輪",
		category: "指輪",
		spawn: { type: "chance", percent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT },
		effect: `装備している間、毎ターン${SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT}%で空腹の進行が止まる(外すと効果も消える)。${RING_CURSE_CHANCE_PERCENT}%で呪われており外せなくなる`,
	},
	sword: {
		catalogName: "剣",
		category: "装備",
		spawn: { type: "chance", percent: SWORD_SPAWN_CHANCE_PERCENT },
		effect: `装備すると攻撃力が${SWORD_ATTACK_BONUS}上がる(持ち替えれば戻る個体ごとの値)。${SWORD_CURSE_CHANCE_PERCENT}%で呪われており外せなくなる(数値への影響はない)`,
	},
	armor: {
		catalogName: "鎧",
		category: "装備",
		spawn: { type: "chance", percent: ARMOR_SPAWN_CHANCE_PERCENT },
		effect: `装備すると防御力が${ARMOR_DEFENSE_BONUS}上がる(持ち替えれば戻る個体ごとの値)。${ARMOR_CURSE_CHANCE_PERCENT}%で呪われており外せなくなる(数値への影響はない)`,
	},
	food: {
		catalogName: "食料",
		category: "食料",
		spawn: { type: "guaranteed", countPerFloor: FOOD_COUNT_PER_FLOOR },
		effect: `満腹度を${FOOD_RATION_RESTORE_AMOUNT}回復する`,
	},
};
