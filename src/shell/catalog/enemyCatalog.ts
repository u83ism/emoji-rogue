import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	ICE_MONSTER_FREEZE_TURNS_MAX,
	ICE_MONSTER_FREEZE_TURNS_MIN,
	MEDUSA_GAZE_CHANCE_PERCENT,
	MEDUSA_GAZE_CONFUSE_DURATION,
	PARALYSIS_DEATH_TURNS,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
	VITALITY_DRAIN_CHANCE_PERCENT,
} from "../../game/balance.js";
import { ERRATIC_MOVE_CHANCE_PERCENT } from "../../game/enemies/enemyFlight.js";
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
	bat: `飛んでいて、プレイヤーから離れている間は1ターンに2回動く。ただし行動のたびに${ERRATIC_MOVE_CHANCE_PERCENT.bat}%の確率で、攻撃も追跡もせずでたらめな方向へ1歩動く`,
	thief: `攻撃が命中すると所持金を盗んで姿を消す(${GOLD_PILE_RANGE}、運が悪いとその${THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME}回分。レベルが高いほど少額で済みやすい)。盗まれる前に倒せば逆に金貨を落とす(これまでに降りた最も深い階にいるときだけ)`,
	nymph:
		"攻撃が命中すると(ダメージは無い)、装備していない魔法の品(薬・巻物・杖・指輪と、補正のある武器・防具)を1つ盗んで姿を消す。盗める物が無ければ居座る",
	aquator:
		"攻撃が命中してもダメージは無いが、装備中の防具を錆びさせ、その防御力を1下げる(0未満にはならない。防具保護の巻物で無効化)",
	orc: `特殊能力はない。倒すと金貨の山1つ分(${GOLD_PILE_RANGE})をその場で落とす`,
	dragon: "最深部にだけ出る最強格。1ターンに3回攻撃する",
	yeti: "特殊能力はない。1ターンに2回攻撃する",
	snake: "特殊能力はない",
	vampire: `攻撃が命中すると、${VITALITY_DRAIN_CHANCE_PERCENT.vampire}%の確率で最大HPとHPを1〜3永続的に奪う`,
	scorpion: "攻撃が命中すると、毒へのセーブに失敗したとき力が1下がる",
	emu: "特殊能力はない",
	kestrel: "飛んでいて、プレイヤーから離れている間は1ターンに2回動く",
	hobgoblin: "特殊能力はない。序盤では一撃が重い",
	centaur: "特殊能力はない。1ターンに3回攻撃する",
	quagga: "特殊能力はない。1ターンに2回攻撃する",
	rhinoceros: "特殊能力はないが非常に硬く、1ターンに3回攻撃する",
	jabberwock: "特殊能力はないがレベルが最も高く、1ターンに2回攻撃する",
	griffin:
		"特殊能力はない。1ターンに2回攻撃する。飛んでいて、プレイヤーから離れている間は1ターンに2回動く",
	troll: "特殊能力はない。1ターンに3回攻撃する",
	"ice-monster": `攻撃が命中してもダメージは無いが、${ICE_MONSTER_FREEZE_TURNS_MIN}〜${ICE_MONSTER_FREEZE_TURNS_MAX}ターン凍りついて動けなくなる。凍っている間に重ねて凍らされると加算され、合計が${PARALYSIS_DEATH_TURNS}ターンを超えると凍え死ぬ`,
	"venus-flytrap":
		"その場から動かず、隣接している間だけ攻撃してくる。隣接中はプレイヤーを拘束し、離れようとする移動を妨げる(その場合もターンは消費される)。ダメージは最初の命中で1、命中するたびに1ずつ増え、外れたターンもそれまでに増えた分のダメージを受ける。倒すか離れると元に戻る",
	medusa: `視界内にいる間、隣接していなくても毎ターン${MEDUSA_GAZE_CHANCE_PERCENT}%の確率で視線攻撃を放ち、${MEDUSA_GAZE_CONFUSE_DURATION}ターン混乱させる。1ターンに3回攻撃する`,
	phantom: `姿が透明で、隣接するまで見えない(索敵の薬の効果中を除く)。行動のたびに${ERRATIC_MOVE_CHANCE_PERCENT.phantom}%の確率で、攻撃も追跡もせずでたらめな方向へ1歩動く`,
	wraith: `攻撃が命中すると、${VITALITY_DRAIN_CHANCE_PERCENT.wraith}%の確率でレベルを1つと、最大HPとHPを1〜10永続的に奪う(経験値が0なら死ぬ)`,
	xeroc: "眠っている間は金貨の山に擬態しており、目覚めるまで正体が分からない",
};
