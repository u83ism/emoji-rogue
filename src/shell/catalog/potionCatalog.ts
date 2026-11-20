import {
	BLIND_POTION_DURATION,
	BLIND_POTION_SPAWN_CHANCE_PERCENT,
	BLIND_VIEW_RADIUS,
	CONFUSION_POTION_DURATION,
	CONFUSION_POTION_SPAWN_CHANCE_PERCENT,
	DETECT_MONSTER_POTION_DURATION,
	DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	EXTRA_HEALING_POTION_DICE_SIDES,
	HALLUCINATION_POTION_DURATION,
	HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
	HASTE_EXHAUSTION_TURNS_MAX,
	HASTE_POTION_TURNS_MAX,
	HASTE_POTION_TURNS_MIN,
	HEAL_POTION_DICE_SIDES,
	LEVITATION_POTION_DURATION,
	LEVITATION_POTION_SPAWN_CHANCE_PERCENT,
	OTHER_POTION_SPAWN_CHANCE_PERCENT,
	POISON_POTION_SPAWN_CHANCE_PERCENT,
	POISON_POTION_STRENGTH_LOSS_MAX,
	POTION_COUNT_PER_FLOOR,
	RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_STRENGTH_GAIN,
} from "../../game/balance.js";
import type { PotionKind } from "../../game/events.js";
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
		effect: `HPを「レベル」個の${HEAL_POTION_DICE_SIDES}面ダイス分回復する。最大HPを超える分は捨てられる代わりに、最大HPが1増える`,
	},
	poison: {
		catalogName: "毒薬",
		category: "薬",
		spawn: { type: "chance", percent: POISON_POTION_SPAWN_CHANCE_PERCENT },
		effect: `力が1〜${POISON_POTION_STRENGTH_LOSS_MAX}下がる(ダメージは無い)。幻覚が治る`,
	},
	strength: {
		catalogName: "怪力の薬",
		category: "薬",
		spawn: { type: "chance", percent: STRENGTH_POTION_SPAWN_CHANCE_PERCENT },
		effect: `力が${STRENGTH_POTION_STRENGTH_GAIN}上がる(力は命中とダメージに効く)`,
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
	hallucination: {
		catalogName: "幻覚の薬",
		category: "薬",
		spawn: {
			type: "chance",
			percent: HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT,
		},
		effect: `${HALLUCINATION_POTION_DURATION}ターンの間、敵の見た目だけが惑わされる(実際の種類・強さ・行動は変わらない)`,
	},
	"restore-strength-potion": {
		catalogName: "力の回復の薬",
		category: "薬",
		spawn: { type: "chance", percent: OTHER_POTION_SPAWN_CHANCE_PERCENT },
		effect:
			"下がった力をこれまでの最大値まで戻す(怪力の指輪の分はそのまま上乗せ)",
	},
	"extra-healing-potion": {
		catalogName: "超回復の薬",
		category: "薬",
		spawn: { type: "chance", percent: OTHER_POTION_SPAWN_CHANCE_PERCENT },
		effect: `レベル×1d${EXTRA_HEALING_POTION_DICE_SIDES}回復する。満タンを超えると最大HPが1(大きく超えれば2)上がる。盲目と幻覚も治る`,
	},
	"haste-self-potion": {
		catalogName: "加速の薬",
		category: "薬",
		spawn: { type: "chance", percent: OTHER_POTION_SPAWN_CHANCE_PERCENT },
		effect: `${HASTE_POTION_TURNS_MIN}〜${HASTE_POTION_TURNS_MAX}ターンの間、敵1回の行動につき2回動ける。加速中にもう1本飲むと疲れ果てて0〜${HASTE_EXHAUSTION_TURNS_MAX}ターン気を失い、加速も切れる`,
	},
};
