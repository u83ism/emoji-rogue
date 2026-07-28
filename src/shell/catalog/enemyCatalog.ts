import {
	AQUATOR_RUST_CHANCE_PERCENT,
	AQUATOR_SPAWN_CHANCE_PERCENT,
	CENTAUR_SPAWN_CHANCE_PERCENT,
	DRAGON_SPAWN_CHANCE_PERCENT,
	EMU_SPAWN_CHANCE_PERCENT,
	ENEMY_COUNT_SCALING,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	GRIFFIN_MIN_SPAWN_FLOOR,
	GRIFFIN_REGEN_AMOUNT,
	GRIFFIN_SPAWN_CHANCE_PERCENT,
	HOBGOBLIN_SPAWN_CHANCE_PERCENT,
	ICKY_THING_SPAWN_CHANCE_PERCENT,
	JABBERWOCK_MIN_SPAWN_FLOOR,
	JABBERWOCK_SPAWN_CHANCE_PERCENT,
	KESTREL_SPAWN_CHANCE_PERCENT,
	MEDUSA_GAZE_CHANCE_PERCENT,
	MEDUSA_GAZE_CONFUSE_DURATION,
	MEDUSA_MIN_SPAWN_FLOOR,
	MEDUSA_SPAWN_CHANCE_PERCENT,
	NYMPH_SPAWN_CHANCE_PERCENT,
	ORC_SPAWN_CHANCE_PERCENT,
	PHANTOM_MIN_SPAWN_FLOOR,
	PHANTOM_SPAWN_CHANCE_PERCENT,
	QUAGGA_SPAWN_CHANCE_PERCENT,
	RAT_SPAWN_CHANCE_PERCENT,
	SNAKE_SPAWN_CHANCE_PERCENT,
	THIEF_SPAWN_CHANCE_PERCENT,
	TROLL_MIN_SPAWN_FLOOR,
	TROLL_REGEN_AMOUNT,
	TROLL_SPAWN_CHANCE_PERCENT,
	UR_VILE_SPAWN_CHANCE_PERCENT,
	VAMPIRE_LIFESTEAL_PERCENT,
	VAMPIRE_SPAWN_CHANCE_PERCENT,
	VENUS_FLYTRAP_SPAWN_CHANCE_PERCENT,
	WRAITH_DRAIN_AMOUNT,
	WRAITH_MIN_SPAWN_FLOOR,
	WRAITH_SPAWN_CHANCE_PERCENT,
	XEROC_SPAWN_CHANCE_PERCENT,
	YETI_SPAWN_CHANCE_PERCENT,
} from "../../game/balance.js";
import type { EnemyKind } from "../../game/events.js";
import type { SpawnInfo } from "./catalogData.js";

// The enemy half of docs/catalog.md's prose data — split out of
// catalogData.ts (milestone 101 follow-up) once adding the second batch of
// original-Rogue monsters would have pushed that file's combined enemy+trap
// data past the 200-line structure-lint limit, same split-not-justify
// choice as milestone 71's original item catalog split. Numbers inside
// descriptions are ALWAYS interpolated from balance.ts constants — never
// typed by hand — so a balance change regenerates into correct prose.
// Record over the kind union: adding a kind without a catalog entry is a
// compile error, which is the whole point versus a hand-written list.

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
	snake: {
		spawn: { type: "chance", percent: SNAKE_SPAWN_CHANCE_PERCENT },
		behavior: "HPは低いが噛みつきのダメージが高い近接アタッカー",
	},
	vampire: {
		spawn: { type: "chance", percent: VAMPIRE_SPAWN_CHANCE_PERCENT },
		behavior: `逃げずに戦い続け、攻撃が命中するたびそのダメージの${VAMPIRE_LIFESTEAL_PERCENT}%を自分のHPとして回復する(最大HPが上限)`,
	},
	rat: {
		spawn: { type: "chance", percent: RAT_SPAWN_CHANCE_PERCENT },
		behavior: "最弱の雑魚。特殊能力はない",
	},
	emu: {
		spawn: { type: "chance", percent: EMU_SPAWN_CHANCE_PERCENT },
		behavior:
			"HPは低いが噛みつきのダメージが高い近接アタッカー(蛇と同系統だがさらに打たれ弱い)",
	},
	kestrel: {
		spawn: { type: "chance", percent: KESTREL_SPAWN_CHANCE_PERCENT },
		behavior: "速いが打たれ弱い。コウモリより攻撃が鋭い",
	},
	hobgoblin: {
		spawn: { type: "chance", percent: HOBGOBLIN_SPAWN_CHANCE_PERCENT },
		behavior: "中堅の近接アタッカー。特殊能力はない",
	},
	centaur: {
		spawn: { type: "chance", percent: CENTAUR_SPAWN_CHANCE_PERCENT },
		behavior: "オークより頑丈な近接アタッカー。特殊能力はない",
	},
	quagga: {
		spawn: { type: "chance", percent: QUAGGA_SPAWN_CHANCE_PERCENT },
		behavior:
			"コウモリ・ケストレルと同じく素早く2回行動するが、1発あたりの威力も高い",
	},
	"ur-vile": {
		spawn: { type: "chance", percent: UR_VILE_SPAWN_CHANCE_PERCENT },
		behavior: "雪男とドラゴンの中間の強さの近接アタッカー。特殊能力はない",
	},
	jabberwock: {
		spawn: { type: "chance", percent: JABBERWOCK_SPAWN_CHANCE_PERCENT },
		behavior: `特殊能力はないがドラゴンに匹敵する最強格。${JABBERWOCK_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	griffin: {
		spawn: { type: "chance", percent: GRIFFIN_SPAWN_CHANCE_PERCENT },
		behavior: `素早く2回行動するうえ、毎ターン${GRIFFIN_REGEN_AMOUNT}ずつHPが回復する。${GRIFFIN_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	troll: {
		spawn: { type: "chance", percent: TROLL_SPAWN_CHANCE_PERCENT },
		behavior: `毎ターン${TROLL_REGEN_AMOUNT}ずつHPが回復する頑丈な近接アタッカー。${TROLL_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	"icky-thing": {
		spawn: { type: "chance", percent: ICKY_THING_SPAWN_CHANCE_PERCENT },
		behavior:
			"盲目で、隣接するまで気づかない。目覚めても追跡してこず徘徊するだけ",
	},
	"venus-flytrap": {
		spawn: { type: "chance", percent: VENUS_FLYTRAP_SPAWN_CHANCE_PERCENT },
		behavior: "その場から動かず、隣接している間だけ攻撃してくる",
	},
	medusa: {
		spawn: { type: "chance", percent: MEDUSA_SPAWN_CHANCE_PERCENT },
		behavior: `視界内にいる間、隣接していなくても毎ターン${MEDUSA_GAZE_CHANCE_PERCENT}%の確率で視線攻撃を放ち、${MEDUSA_GAZE_CONFUSE_DURATION}ターン混乱させる。${MEDUSA_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	phantom: {
		spawn: { type: "chance", percent: PHANTOM_SPAWN_CHANCE_PERCENT },
		behavior: `姿が透明で、隣接するまで見えない(索敵の薬・千里眼の指輪の効果中を除く)。${PHANTOM_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	wraith: {
		spawn: { type: "chance", percent: WRAITH_SPAWN_CHANCE_PERCENT },
		behavior: `攻撃が命中するたび最大HPを${WRAITH_DRAIN_AMOUNT}永続的に奪う。${WRAITH_MIN_SPAWN_FLOOR}階以降にのみ出現`,
	},
	xeroc: {
		spawn: { type: "chance", percent: XEROC_SPAWN_CHANCE_PERCENT },
		behavior:
			"眠っている間は金貨の山に擬態しており、目覚めるまで正体が分からない",
	},
};
