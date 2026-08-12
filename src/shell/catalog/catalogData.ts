import {
	BEAR_TRAP_PARALYSIS_DURATION,
	BEAR_TRAP_SPAWN_CHANCE_PERCENT,
	DART_TRAP_DAMAGE,
	GOAL_FLOOR,
	RUST_TRAP_SPAWN_CHANCE_PERCENT,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
	SLEEPING_GAS_TRAP_SPAWN_CHANCE_PERCENT,
	TELEPORT_TRAP_SPAWN_CHANCE_PERCENT,
	TRAP_COUNT_PER_FLOOR,
	TRAPDOOR_SPAWN_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { TrapKind } from "../../game/events.js";

// The trap half of docs/catalog.md's prose data, plus the shared SpawnInfo/
// ItemCategory types every catalog file builds on (items live in
// itemCatalog.ts/potionCatalog.ts, enemies in enemyCatalog.ts — split out in
// milestone 101 once the combined file would have crossed the 200-line
// structure-lint limit). Numbers inside descriptions are ALWAYS interpolated
// from balance.ts constants — never typed by hand — so a balance change
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
	bear: {
		spawn: { type: "chance", percent: BEAR_TRAP_SPAWN_CHANCE_PERCENT },
		effect: `ダメージはないが${BEAR_TRAP_PARALYSIS_DURATION}ターン動けなくなる`,
	},
	rust: {
		spawn: { type: "chance", percent: RUST_TRAP_SPAWN_CHANCE_PERCENT },
		effect:
			"ダメージはないが装備中の防具が錆びつき防御力が1下がる(防具保護の巻物で無効化)",
	},
	"sleeping-gas": {
		spawn: { type: "chance", percent: SLEEPING_GAS_TRAP_SPAWN_CHANCE_PERCENT },
		effect: `ダメージはないが${SLEEPING_GAS_TRAP_PARALYSIS_DURATION}ターン眠り込んで動けなくなる`,
	},
};
