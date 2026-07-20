import {
	BLIND_POTION_DURATION,
	BLIND_POTION_SPAWN_CHANCE_PERCENT,
	BLIND_VIEW_RADIUS,
	CONFUSION_POTION_DURATION,
	CONFUSION_POTION_SPAWN_CHANCE_PERCENT,
	DETECT_MONSTER_POTION_DURATION,
	DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	HALLUCINATION_POTION_DURATION,
	HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
	LEVITATION_POTION_DURATION,
	LEVITATION_POTION_SPAWN_CHANCE_PERCENT,
	LIFE_POTION_MAX_HP_BONUS,
	LIFE_POTION_SPAWN_CHANCE_PERCENT,
	PARALYSIS_POTION_DURATION,
	PARALYSIS_POTION_SPAWN_CHANCE_PERCENT,
	POISON_DAMAGE,
	POISON_POTION_SPAWN_CHANCE_PERCENT,
	POTION_COUNT_PER_FLOOR,
	POTION_HEAL_AMOUNT,
	RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_ATTACK_BONUS,
	STRENGTH_POTION_SPAWN_CHANCE_PERCENT,
} from "../game/balance.js";
import type { PotionKind } from "../game/events.js";
import type { ItemCatalogEntry } from "./catalogData.js";

// The potion rows of the item catalog — composed into ITEM_CATALOG in
// itemCatalog.ts. Same rules as catalogData.ts: numbers interpolated from
// balance.ts, a Record over PotionKind so a new potion without an entry is
// a compile error.

export const POTION_CATALOG: Readonly<Record<PotionKind, ItemCatalogEntry>> = {
	"heal-potion": {
		catalogName: "回復薬",
		category: "薬",
		spawn: { type: "guaranteed", countPerFloor: POTION_COUNT_PER_FLOOR },
		effect: `HPを${POTION_HEAL_AMOUNT}回復する`,
	},
	poison: {
		catalogName: "毒薬",
		category: "薬",
		spawn: { type: "chance", percent: POISON_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${POISON_DAMAGE}ダメージを受ける`,
	},
	strength: {
		catalogName: "怪力の薬",
		category: "薬",
		spawn: { type: "chance", percent: STRENGTH_POTION_SPAWN_CHANCE_PERCENT },
		effect: `攻撃力が${STRENGTH_POTION_ATTACK_BONUS}恒久的に上がる`,
	},
	confusion: {
		catalogName: "混乱の薬",
		category: "薬",
		spawn: { type: "chance", percent: CONFUSION_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${CONFUSION_POTION_DURATION}ターンの間、移動方向がランダムになる`,
	},
	levitation: {
		catalogName: "浮遊の薬",
		category: "薬",
		spawn: { type: "chance", percent: LEVITATION_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${LEVITATION_POTION_DURATION}ターンの間、わなを踏まなくなる`,
	},
	blindness: {
		catalogName: "盲目の薬",
		category: "薬",
		spawn: { type: "chance", percent: BLIND_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${BLIND_POTION_DURATION}ターンの間、視界が周囲${BLIND_VIEW_RADIUS}マスに縮む`,
	},
	paralysis: {
		catalogName: "麻痺の薬",
		category: "薬",
		spawn: { type: "chance", percent: PARALYSIS_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${PARALYSIS_POTION_DURATION}ターンの間、行動できなくなる(敵は動く)`,
	},
	"raise-level": {
		catalogName: "レベルアップの薬",
		category: "薬",
		spawn: {
			type: "chance",
			percent: RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
		},
		effect: "レベルが1上がる(経験値は消費しない)",
	},
	"detect-monster": {
		catalogName: "索敵の薬",
		category: "薬",
		spawn: {
			type: "chance",
			percent: DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
		},
		effect: `${DETECT_MONSTER_POTION_DURATION}ターンの間、視界外の敵も見える`,
	},
	life: {
		catalogName: "生命の薬",
		category: "薬",
		spawn: { type: "chance", percent: LIFE_POTION_SPAWN_CHANCE_PERCENT },
		effect: `最大HPが${LIFE_POTION_MAX_HP_BONUS}恒久的に上がり、全回復する`,
	},
	hallucination: {
		catalogName: "幻覚の薬",
		category: "薬",
		spawn: {
			type: "chance",
			percent: HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
		},
		effect: `${HALLUCINATION_POTION_DURATION}ターンの間、敵の見た目だけが惑わされる(実際の種類・強さ・行動は変わらない)`,
	},
};
