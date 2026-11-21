import {
	ARMOR_CURSE_CHANCE_PERCENT,
	ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT,
	ENCHANT_ARMOR_BONUS,
	ENCHANT_WEAPON_BONUS,
	FOOD_DROUGHT_FLOOR_LIMIT,
	FOOD_RATION_RESTORE_MAX,
	FOOD_RATION_RESTORE_MIN,
	FOUND_BONUS_ADJUSTMENT_MAX,
	FOUND_BONUS_ADJUSTMENT_MIN,
	HOLD_MONSTER_SCROLL_RANGE,
	PLAYER_MAX_FOOD,
	PLAYER_START_FOOD,
	SLEEP_SCROLL_TURNS_MAX,
	SLEEP_SCROLL_TURNS_MIN,
	WEAPON_CURSE_CHANCE_PERCENT,
	WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { ItemKind } from "../../game/events.js";
import { type ItemCatalogEntry, itemDrawShare } from "./catalogData.js";
import { POTION_CATALOG } from "./potionCatalog.js";
import { RING_CATALOG } from "./ringCatalog.js";
import { WAND_CATALOG } from "./wandCatalog.js";

// The scroll/weapon/armor/food rows of the item catalog, composed with
// POTION_CATALOG, RING_CATALOG and WAND_CATALOG into the full Record<ItemKind, ...> — the
// annotation makes a kind missing from any of the three a compile error.
// Same rules as catalogData.ts: numbers always interpolated from balance.ts.

export const ITEM_CATALOG: Readonly<Record<ItemKind, ItemCatalogEntry>> = {
	...POTION_CATALOG,
	...RING_CATALOG,
	...WAND_CATALOG,
	"teleport-scroll": {
		catalogName: "テレポートの巻物",
		category: "巻物",
		spawn: itemDrawShare("teleport-scroll"),
		effect: "フロア内のランダムな床へ瞬間移動する",
	},
	"mapping-scroll": {
		catalogName: "地図の巻物",
		category: "巻物",
		spawn: itemDrawShare("mapping-scroll"),
		effect: "フロア全体の地形が既踏破になる",
	},
	"identify-potion-scroll": {
		catalogName: "薬識別の巻物",
		category: "巻物",
		spawn: itemDrawShare("identify-potion-scroll"),
		effect:
			"持っている薬を1つ選び、その種類の正体が判明する(本家の「薬の識別」の巻物。薬を持っていなければ何も起きずに無くなる)",
	},
	"confuse-monster-scroll": {
		catalogName: "混乱の巻物",
		category: "巻物",
		spawn: itemDrawShare("confuse-monster-scroll"),
		effect:
			"読むと両手が赤く光り、次に攻撃(投げ物・魔法の矢も)を当てた敵を混乱させる。混乱した敵は5回に4回でたらめに動き、そのたびに1/20の確率で正気に戻る",
	},
	"sleep-scroll": {
		catalogName: "眠りの巻物",
		category: "巻物",
		spawn: itemDrawShare("sleep-scroll"),
		effect: `読むと${SLEEP_SCROLL_TURNS_MIN}〜${SLEEP_SCROLL_TURNS_MAX}ターン眠り込んで動けなくなる`,
	},
	"create-monster-scroll": {
		catalogName: "召喚の巻物",
		category: "巻物",
		spawn: itemDrawShare("create-monster-scroll"),
		effect:
			"周り8マスのどこかに、その階の敵が1体現れる(空きが無ければ何も起きない)",
	},
	"aggravate-monsters-scroll": {
		catalogName: "警報の巻物",
		category: "巻物",
		spawn: itemDrawShare("aggravate-monsters-scroll"),
		effect: "その階の敵が全員目を覚ます",
	},
	"hold-monster-scroll": {
		catalogName: "束縛の巻物",
		category: "巻物",
		spawn: itemDrawShare("hold-monster-scroll"),
		effect: `周囲${HOLD_MONSTER_SCROLL_RANGE}マス以内の起きている敵を、攻撃されるまでその場で止める(いなければ何も起きずに無くなる)`,
	},
	"enchant-weapon": {
		catalogName: "武器強化の巻物",
		category: "巻物",
		spawn: itemDrawShare("enchant-weapon"),
		effect: `装備中の武器の命中補正かダメージ補正のどちらか(半々)を${ENCHANT_WEAPON_BONUS}恒久的に上げ、呪いも解く(武器を装備していなければ何も起きずに無くなる)`,
	},
	"enchant-armor": {
		catalogName: "防具強化の巻物",
		category: "巻物",
		spawn: itemDrawShare("enchant-armor"),
		effect: `装備中の防具の防御力を${ENCHANT_ARMOR_BONUS}恒久的に上げ、呪いも解く(防具を装備していなければ何も起きずに無くなる)`,
	},
	"protect-armor": {
		catalogName: "防具保護の巻物",
		category: "巻物",
		spawn: itemDrawShare("protect-armor"),
		effect:
			"装備中の防具を錆びなくする(アクエーターの錆攻撃を無効化。防具を装備していなければ何も起きずに無くなる)",
	},
	"remove-curse-scroll": {
		catalogName: "解呪の巻物",
		category: "巻物",
		spawn: itemDrawShare("remove-curse-scroll"),
		effect: "装備中で呪われている武器・防具・指輪を全て解呪する",
	},
	weapon: {
		catalogName: "武器",
		category: "装備",
		spawn: itemDrawShare("weapon"),
		effect: `9種類のどれか(下の「武器の種類」)。装備すると攻撃のダメージが素手の1d4からその武器のダイスに変わる。装備していない武器は投げられる。個体ごとに命中補正とダメージ補正を持つ。${WEAPON_CURSE_CHANCE_PERCENT}%で呪われており、外せなくなるうえ命中補正が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}低い。${WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT}%で最初から強化されており命中補正が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}高い。どちらも装備するまで分からない`,
	},
	armor: {
		catalogName: "防具",
		category: "装備",
		spawn: itemDrawShare("armor"),
		effect: `8種類のどれか(下の「防具の種類」)。装備すると種類ごとの防御力が付き、敵の攻撃が当たりにくくなる(ダメージは減らない)。${ARMOR_CURSE_CHANCE_PERCENT}%で呪われており、外せなくなるうえ防御力が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}低い。${ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT}%で最初から強化されており防御力が${FOUND_BONUS_ADJUSTMENT_MIN}〜${FOUND_BONUS_ADJUSTMENT_MAX}高い。どちらも装備するまで分からない`,
	},
	food: {
		catalogName: "食料",
		category: "食料",
		spawn: itemDrawShare("food"),
		effect: `満腹度を${FOOD_RATION_RESTORE_MIN}〜${FOOD_RATION_RESTORE_MAX}回復する(上限${PLAYER_MAX_FOOD}。開始時は${PLAYER_START_FOOD}で、1ターンに1減る)。最初から1個持っている。食料の出ない階が${FOOD_DROUGHT_FLOOR_LIMIT}階を超えて続くと、次のアイテムは必ず食料になる`,
	},
};
