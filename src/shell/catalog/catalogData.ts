import {
	ARROW_TRAP_DAMAGE_DICE,
	BEAR_TRAP_STUCK_TURNS,
	DART_TRAP_DAMAGE_DICE,
	MAX_TRAPS_PER_FLOOR,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
} from "../../game/balance.js";
import type { ItemKind, TrapKind } from "../../game/events.js";
import { calculateItemDrawSharePercent } from "../../game/floor/spawnTable.js";

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
	/** An item's share of one item draw (floor/spawnTable.ts) — see itemDrawShare. */
	| { readonly type: "share"; readonly percent: number }
	/** Anything a count or a single percentage cannot say — the text is printed as is. */
	| { readonly type: "described"; readonly description: string };

/** How often a found item is `kind`, original Rogue's way (floor/spawnTable.ts). */
export const itemDrawShare = (kind: ItemKind): SpawnInfo => ({
	type: "share",
	percent: calculateItemDrawSharePercent(kind),
});

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

/** Every trap kind shares one placement rule (floor/traps.ts). */
const TRAP_SPAWN: SpawnInfo = {
	type: "described",
	description: `N階ではN/10の確率でわなが置かれ、その数は1〜N/4個(最大${MAX_TRAPS_PER_FLOOR}個)。8種のどれも同じ確率`,
};

export const TRAP_CATALOG: Readonly<Record<TrapKind, TrapCatalogEntry>> = {
	trapdoor: { spawn: TRAP_SPAWN, effect: "次のフロアへ強制落下する" },
	arrow: {
		spawn: TRAP_SPAWN,
		effect: `矢が飛んでくる(レベルより1低い相手の攻撃と同じ当たりやすさ)。当たると${ARROW_TRAP_DAMAGE_DICE.count}d${ARROW_TRAP_DAMAGE_DICE.sides}ダメージ、外れると矢が足元に落ちる`,
	},
	"sleeping-gas": {
		spawn: TRAP_SPAWN,
		effect: `ダメージはないが${SLEEPING_GAS_TRAP_PARALYSIS_DURATION}ターン眠り込んで動けなくなる`,
	},
	bear: {
		spawn: TRAP_SPAWN,
		effect: `ダメージはないが、${BEAR_TRAP_STUCK_TURNS}回移動しようとするまでその場から動けない(攻撃や持ち物はそのまま使える)`,
	},
	teleport: { spawn: TRAP_SPAWN, effect: "フロア内のランダムな床へ飛ばされる" },
	dart: {
		spawn: TRAP_SPAWN,
		effect: `毒矢が飛んでくる。防具が硬いほど外れやすく、当たると${DART_TRAP_DAMAGE_DICE.count}d${DART_TRAP_DAMAGE_DICE.sides}ダメージ。さらに毒へのセーブに失敗すると力が1下がる(持続の指輪で防げる)`,
	},
	rust: {
		spawn: TRAP_SPAWN,
		effect:
			"ダメージはないが装備中の防具が錆びつき防御力が1下がる(防具保護の巻物・鎧の維持の指輪で防げる)",
	},
	mysterious: {
		spawn: TRAP_SPAWN,
		effect: "不思議な感覚がするだけで、何も起きない",
	},
};
