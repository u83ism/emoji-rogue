import {
	AQUATOR_RUST_CHANCE_PERCENT,
	AQUATOR_SPAWN_CHANCE_PERCENT,
	DART_TRAP_DAMAGE,
	DRAGON_SPAWN_CHANCE_PERCENT,
	ENEMY_COUNT_SCALING,
	GOAL_FLOOR,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	NYMPH_SPAWN_CHANCE_PERCENT,
	ORC_SPAWN_CHANCE_PERCENT,
	TELEPORT_TRAP_SPAWN_CHANCE_PERCENT,
	THIEF_SPAWN_CHANCE_PERCENT,
	TRAP_COUNT_PER_FLOOR,
	TRAPDOOR_SPAWN_CHANCE_PERCENT,
	YETI_SPAWN_CHANCE_PERCENT,
} from "../game/balance.js";
import type { EnemyKind, TrapKind } from "../game/events.js";

// The enemy/trap half of docs/catalog.md's prose data (items live in
// itemCatalog.ts). Numbers inside descriptions are ALWAYS interpolated from
// balance.ts constants — never typed by hand — so a balance change
// regenerates into correct prose. Records over the kind unions: adding a
// kind without a catalog entry is a compile error, which is the whole point
// versus a hand-written list.

/** How something appears on a floor — formatted by catalog.ts. */
export type SpawnInfo =
	| { readonly type: "guaranteed"; readonly countPerFloor: number }
	| { readonly type: "chance"; readonly percent: number }
	| {
			readonly type: "scaling";
			readonly base: number;
			readonly growthInterval: number;
			readonly max: number;
	  };

export type ItemCategory = "薬" | "巻物" | "杖" | "指輪" | "装備" | "食料";

export interface ItemCatalogEntry {
	/** カタログ上の呼び名 — 実名がゲーム内で汎用名のもの(巻物・指輪・杖)もここでは区別する。 */
	readonly catalogName: string;
	readonly category: ItemCategory;
	readonly spawn: SpawnInfo;
	readonly effect: string;
}

export interface EnemyCatalogEntry {
	readonly spawn: SpawnInfo;
	/** 習性 — qualitative only; every number comes interpolated from balance.ts. */
	readonly behavior: string;
}

export const ENEMY_CATALOG: Readonly<Record<EnemyKind, EnemyCatalogEntry>> = {
	zombie: {
		spawn: { type: "scaling", ...ENEMY_COUNT_SCALING.zombie },
		behavior: "基本の敵。視界に入ると追跡し、隣接すると攻撃してくる",
	},
	bat: {
		spawn: { type: "scaling", ...ENEMY_COUNT_SCALING.bat },
		behavior: "速いが打たれ弱い。隣接されたまま1ターン過ごすと2発殴られる",
	},
	thief: {
		spawn: { type: "chance", percent: THIEF_SPAWN_CHANCE_PERCENT },
		behavior:
			"ダメージは与えず、接触すると所持金を盗んで姿を消す。倒せば盗まれない",
	},
	nymph: {
		spawn: { type: "chance", percent: NYMPH_SPAWN_CHANCE_PERCENT },
		behavior: "ダメージは与えず、接触すると持ち物を1つ盗んで姿を消す",
	},
	aquator: {
		spawn: { type: "chance", percent: AQUATOR_SPAWN_CHANCE_PERCENT },
		behavior: `攻撃が命中するたび${AQUATOR_RUST_CHANCE_PERCENT}%で装備中の防具を錆びさせ、その防御力を1下げる(0未満にはならない。防具保護の巻物で無効化)`,
	},
	orc: {
		spawn: { type: "chance", percent: ORC_SPAWN_CHANCE_PERCENT },
		behavior: `頑丈な近接アタッカー。倒すと${GOLD_AMOUNT_MIN}〜${GOLD_AMOUNT_MAX}ゴールドをその場で落とす`,
	},
	dragon: {
		spawn: { type: "chance", percent: DRAGON_SPAWN_CHANCE_PERCENT },
		behavior:
			"希少な最強格の近接アタッカー。特殊能力はないが桁違いに頑丈で攻撃力も高い",
	},
	yeti: {
		spawn: { type: "chance", percent: YETI_SPAWN_CHANCE_PERCENT },
		behavior:
			"頑丈だが低頻度に出現する近接アタッカー。オークとドラゴンの中間の強さ",
	},
};

export interface TrapCatalogEntry {
	readonly spawn: SpawnInfo;
	readonly effect: string;
}

export const TRAP_CATALOG: Readonly<Record<TrapKind, TrapCatalogEntry>> = {
	dart: {
		spawn: { type: "guaranteed", countPerFloor: TRAP_COUNT_PER_FLOOR },
		effect: `${DART_TRAP_DAMAGE}ダメージを受ける`,
	},
	trapdoor: {
		spawn: { type: "chance", percent: TRAPDOOR_SPAWN_CHANCE_PERCENT },
		effect: `次のフロアへ強制落下する(${GOAL_FLOOR}階には出現しない)`,
	},
	teleport: {
		spawn: { type: "chance", percent: TELEPORT_TRAP_SPAWN_CHANCE_PERCENT },
		effect: "フロア内のランダムな床へ飛ばされる",
	},
};
