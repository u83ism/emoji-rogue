import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT,
	ARMOR_SPAWN_CHANCE_PERCENT,
	CONFUSE_MONSTER_SCROLL_DURATION,
	CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_ARMOR_BONUS,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_BONUS,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	FOOD_DROUGHT_FLOOR_LIMIT,
	FOOD_RATION_RESTORE_MAX,
	FOOD_RATION_RESTORE_MIN,
	FOOD_ROLL_CHANCE_BASIS_POINTS,
	FOOD_ROLLS_PER_FLOOR,
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
	HOLD_MONSTER_SCROLL_DURATION,
	HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	MAGIC_MISSILE_DAMAGE_BONUS,
	MAGIC_MISSILE_DAMAGE_DICE,
	MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	PLAYER_MAX_FOOD,
	PLAYER_START_FOOD,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
	SLOW_WAND_DURATION,
	SLOW_WAND_SPAWN_CHANCE_PERCENT,
	TELEPORT_WAND_SPAWN_CHANCE_PERCENT,
	WEAPON_CURSE_CHANCE_PERCENT,
	WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT,
	WEAPON_SPAWN_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { ItemKind } from "../../game/events.js";
import type { ItemCatalogEntry } from "./catalogData.js";
import { POTION_CATALOG } from "./potionCatalog.js";
import { RING_CATALOG } from "./ringCatalog.js";

// The scroll/wand/weapon/armor/food rows of the item catalog, composed with
// POTION_CATALOG and RING_CATALOG into the full Record<ItemKind, ...> — the
// annotation makes a kind missing from any of the three a compile error.
// Same rules as catalogData.ts: numbers always interpolated from balance.ts.

export const ITEM_CATALOG: Readonly<Record<ItemKind, ItemCatalogEntry>> = {
	...POTION_CATALOG,
	...RING_CATALOG,
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
		effect:
			"持っている薬を1つ選び、その種類の正体が判明する(本家の「薬の識別」の巻物。薬を持っていなければ何も起きずに無くなる)",
	},
	"confuse-monster-scroll": {
		catalogName: "混乱の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `視界内の最も近い敵を${CONFUSE_MONSTER_SCROLL_DURATION}ターン混乱させる(以後は視界内でも追跡してこず徘徊するようになる。隣接時の攻撃は変わらず行う)`,
	},
	"hold-monster-scroll": {
		catalogName: "束縛の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `視界内の敵全員を${HOLD_MONSTER_SCROLL_DURATION}ターン行動不能にする(鈍足の杖の範囲版)`,
	},
	"enchant-weapon": {
		catalogName: "武器強化の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `装備中の武器の命中補正かダメージ補正のどちらか(半々)を${ENCHANT_WEAPON_BONUS}恒久的に上げ、呪いも解く(武器を装備していなければ何も起きずに無くなる)`,
	},
	"enchant-armor": {
		catalogName: "防具強化の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: `装備中の防具の防御力を${ENCHANT_ARMOR_BONUS}恒久的に上げ、呪いも解く(防具を装備していなければ何も起きずに無くなる)`,
	},
	"protect-armor": {
		catalogName: "防具保護の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect:
			"装備中の防具を錆びなくする(アクエーターの錆攻撃を無効化。防具を装備していなければ何も起きずに無くなる)",
	},
	"remove-curse-scroll": {
		catalogName: "解呪の巻物",
		category: "巻物",
		spawn: {
			type: "chance",
			percent: REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT,
		},
		effect: "装備中で呪われている武器・防具・指輪を全て解呪する",
	},
	"slow-wand": {
		catalogName: "鈍足の杖",
		category: "杖",
		spawn: { type: "chance", percent: SLOW_WAND_SPAWN_CHANCE_PERCENT },
		effect: `視界内の最も近い敵を${SLOW_WAND_DURATION}ターン行動不能にする。1回使い切り`,
	},
	"teleport-wand": {
		catalogName: "テレポートの杖",
		category: "杖",
		spawn: { type: "chance", percent: TELEPORT_WAND_SPAWN_CHANCE_PERCENT },
		effect:
			"視界内の最も近い敵をフロア内のランダムな床へ強制移動させる。1回使い切り",
	},
	"magic-missile-wand": {
		catalogName: "魔法の矢の杖",
		category: "杖",
		spawn: {
			type: "chance",
			percent: MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT,
		},
		effect: `視界内の最も近い敵に${MAGIC_MISSILE_DAMAGE_DICE.count}d${MAGIC_MISSILE_DAMAGE_DICE.sides}+${MAGIC_MISSILE_DAMAGE_BONUS}(+力と装備中の武器のダメージ補正)の必中ダメージ。敵が魔法へのセーブに成功すると消える。1回使い切り`,
	},
	weapon: {
		catalogName: "武器",
		category: "装備",
		spawn: { type: "chance", percent: WEAPON_SPAWN_CHANCE_PERCENT },
		effect: `9種類のどれか(下の「武器の種類」)。装備すると攻撃のダメージが素手の1d4からその武器のダイスに変わる。装備していない武器は投げられる。個体ごとに命中補正とダメージ補正を持つ。${WEAPON_CURSE_CHANCE_PERCENT}%で呪われており、外せなくなるうえ命中補正が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}低い。${WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT}%で最初から強化されており命中補正が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}高い。どちらも装備するまで分からない`,
	},
	armor: {
		catalogName: "防具",
		category: "装備",
		spawn: { type: "chance", percent: ARMOR_SPAWN_CHANCE_PERCENT },
		effect: `8種類のどれか(下の「防具の種類」)。装備すると種類ごとの防御力が付き、敵の攻撃が当たりにくくなる(ダメージは減らない)。${ARMOR_CURSE_CHANCE_PERCENT}%で呪われており、外せなくなるうえ防御力が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}低い。${ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT}%で最初から強化されており防御力が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}高い。どちらも装備するまで分からない`,
	},
	food: {
		catalogName: "食料",
		category: "食料",
		spawn: {
			type: "described",
			description: `平均${((FOOD_ROLLS_PER_FLOOR * FOOD_ROLL_CHANCE_BASIS_POINTS) / 10000).toFixed(1)}個/フロア。${FOOD_DROUGHT_FLOOR_LIMIT}フロア続けて出なければ次のフロアに必ず1個`,
		},
		effect: `満腹度を${FOOD_RATION_RESTORE_MIN}〜${FOOD_RATION_RESTORE_MAX}回復する(上限${PLAYER_MAX_FOOD}。開始時は${PLAYER_START_FOOD}で、1ターンに1減る)。最初から1個持っている`,
	},
};
