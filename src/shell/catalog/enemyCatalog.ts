import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	GRIFFIN_REGEN_AMOUNT,
	MEDUSA_GAZE_CHANCE_PERCENT,
	MEDUSA_GAZE_CONFUSE_DURATION,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
	TROLL_REGEN_AMOUNT,
	VAMPIRE_LIFESTEAL_PERCENT,
	WRAITH_DRAIN_AMOUNT,
} from "../../game/balance.js";
import type { EnemyKind } from "../../game/events.js";

// The enemy half of docs/catalog.md's prose data — split out of
// catalogData.ts (milestone 101 follow-up) once adding the second batch of
// original-Rogue monsters would have pushed that file's combined enemy+trap
// data past the 200-line structure-lint limit, same split-not-justify
// choice as milestone 71's original item catalog split. Only what a kind
// does that its numbers don't show: level, armor class, attack dice,
// experience and spawn floors are columns catalog.ts fills straight from
// enemies/enemyStats.ts and floor/enemies.ts. Numbers inside descriptions
// are ALWAYS interpolated from balance.ts constants — never typed by hand —
// so a balance change regenerates into correct prose. Record over the kind
// union: adding a kind without a catalog entry is a compile error, which is
// the whole point versus a hand-written list.

/** 金貨の山1つ分 — the amount grows with the floor, so it is stated as the floor-1 range plus the per-floor step. */
const GOLD_PILE_RANGE = `1階で${GOLD_AMOUNT_MIN}〜${calculateGoldAmountMax(1)}ゴールド、1階深くなるごとに上限が${calculateGoldAmountMax(2) - calculateGoldAmountMax(1)}増える`;

/** 習性 — qualitative only; every number comes interpolated from balance.ts. */
export const ENEMY_BEHAVIOR: Readonly<Record<EnemyKind, string>> = {
	zombie: "特殊能力はない。視界に入ると追跡し、隣接すると攻撃してくる",
	bat: "特殊能力はない",
	thief: `攻撃はせず、接触すると所持金を盗んで姿を消す(${GOLD_PILE_RANGE}、運が悪いとその${THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME}回分。レベルが高いほど少額で済みやすい)。盗まれる前に倒せば逆に金貨を落とす(これまでに降りた最も深い階にいるときだけ)`,
	nymph: "攻撃はせず、接触すると持ち物を1つ盗んで姿を消す",
	aquator:
		"攻撃が命中してもダメージは無いが、装備中の防具を錆びさせ、その防御力を1下げる(0未満にはならない。防具保護の巻物で無効化)",
	orc: `特殊能力はない。倒すと金貨の山1つ分(${GOLD_PILE_RANGE})をその場で落とす`,
	dragon: "最深部にだけ出る最強格。1ターンに3回攻撃する",
	yeti: "特殊能力はない。1ターンに2回攻撃する",
	snake: "特殊能力はない",
	vampire: `攻撃が命中するとそのダメージの${VAMPIRE_LIFESTEAL_PERCENT}%を自分のHPとして回復する(出現時のHPが上限)`,
	rat: "特殊能力はない",
	emu: "特殊能力はない",
	kestrel: "特殊能力はない",
	hobgoblin: "特殊能力はない。序盤では一撃が重い",
	centaur: "特殊能力はない。1ターンに3回攻撃する",
	quagga: "特殊能力はない。1ターンに2回攻撃する",
	"ur-vile": "特殊能力はないが非常に硬く、1ターンに3回攻撃する",
	jabberwock: "特殊能力はないがレベルが最も高く、1ターンに2回攻撃する",
	griffin: `毎ターン${GRIFFIN_REGEN_AMOUNT}ずつHPが回復する。1ターンに2回攻撃する`,
	troll: `毎ターン${TROLL_REGEN_AMOUNT}ずつHPが回復する。1ターンに3回攻撃する`,
	"icky-thing":
		"盲目で、隣接するまで気づかない。目覚めても追跡してこず徘徊するだけ",
	"venus-flytrap":
		"その場から動かず、隣接している間だけ攻撃してくる。隣接中はプレイヤーを拘束し、離れようとする移動を妨げる(その場合もターンは消費される)。ダメージは最初の命中で1、命中するたびに1ずつ増え、外れたターンもそれまでに増えた分のダメージを受ける。倒すか離れると元に戻る",
	medusa: `視界内にいる間、隣接していなくても毎ターン${MEDUSA_GAZE_CHANCE_PERCENT}%の確率で視線攻撃を放ち、${MEDUSA_GAZE_CONFUSE_DURATION}ターン混乱させる。1ターンに3回攻撃する`,
	phantom:
		"姿が透明で、隣接するまで見えない(索敵の薬・千里眼の指輪の効果中を除く)",
	wraith: `攻撃が命中すると最大HPを${WRAITH_DRAIN_AMOUNT}永続的に奪う`,
	xeroc: "眠っている間は金貨の山に擬態しており、目覚めるまで正体が分からない",
};
