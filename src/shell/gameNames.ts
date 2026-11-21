import type { ItemAppearances } from "../game/appearances.js";
import {
	type BoltKind,
	type DeathCause,
	type EnemyKind,
	type EnemyName,
	type EquipmentVariant,
	IDENTIFIABLE_ITEM_KINDS,
	type ItemKind,
	type TrapKind,
} from "../game/events.js";
import { resolveUnidentifiedName } from "./appearanceNames.js";

// The name dictionaries behind eventMessages.ts / messages.ts — same i18n discipline: the
// core never produces strings, and a locale swap touches this pair of files
// only.

export const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
	bat: "コウモリ",
	thief: "盗賊",
	nymph: "ニンフ",
	aquator: "アクエーター",
	orc: "オーク",
	dragon: "ドラゴン",
	yeti: "雪男",
	snake: "蛇",
	vampire: "ヴァンパイア",
	scorpion: "サソリ",
	emu: "エミュー",
	kestrel: "ケストレル",
	hobgoblin: "ホブゴブリン",
	centaur: "ケンタウロス",
	quagga: "クアッガ",
	rhinoceros: "サイ",
	jabberwock: "ジャバウォック",
	griffin: "グリフィン",
	troll: "トロル",
	"ice-monster": "アイスモンスター",
	"venus-flytrap": "ハエトリソウ",
	medusa: "メデューサ",
	phantom: "ファントム",
	wraith: "レイス",
	xeroc: "ゼロック",
};

/** A monster as a log line names it — "something" (one the player cannot see) is 「何か」, as original Rogue's set_mname(). */
export const formatEnemyName = (name: EnemyName): string =>
	name === "something" ? "何か" : ENEMY_NAMES[name];

export const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	"heal-potion": "回復薬",
	/* The category names — a held or picked-up one is shown by its own kind's name, see EQUIPMENT_NAMES. */
	weapon: "武器",
	armor: "防具",
	food: "食料",
	poison: "毒薬",
	"teleport-scroll": "巻物",
	"mapping-scroll": "地図の巻物",
	"identify-potion-scroll": "薬識別の巻物",
	strength: "怪力の薬",
	/* Rings and wands are real names too — resolveItemDisplayName hides them behind 指輪/杖 until worn or zapped. */
	"regeneration-ring": "再生の指輪",
	"sustenance-ring": "満腹の指輪",
	"enchant-weapon": "武器強化の巻物",
	"enchant-armor": "防具強化の巻物",
	confusion: "混乱の薬",
	"slow-wand": "鈍足の杖",
	levitation: "浮遊の薬",
	"protect-armor": "防具保護の巻物",
	blindness: "盲目の薬",
	"raise-level": "レベルアップの薬",
	"detect-monster": "索敵の薬",
	"remove-curse-scroll": "解呪の巻物",
	"teleport-wand": "テレポートの杖",
	"stealth-ring": "隠密の指輪",
	"magic-missile-wand": "魔法の矢の杖",
	"polymorph-wand": "変身の杖",
	"cancellation-wand": "打ち消しの杖",
	"invisibility-wand": "透明化の杖",
	"drain-life-wand": "吸命の杖",
	"lightning-wand": "電撃の杖",
	"cold-wand": "冷気の杖",
	"fire-wand": "炎の杖",
	"light-wand": "光の杖",
	"nothing-wand": "無の杖",
	"teleport-to-wand": "引き寄せの杖",
	"haste-monster-wand": "加速の杖",
	/* Scrolls show their real name immediately, unlike potions/rings/wands — no generic placeholder. */
	"confuse-monster-scroll": "混乱の巻物",
	hallucination: "幻覚の薬",
	"hold-monster-scroll": "束縛の巻物",
	"sleep-scroll": "眠りの巻物",
	"create-monster-scroll": "召喚の巻物",
	"aggravate-monsters-scroll": "警報の巻物",
	"identify-scroll-scroll": "巻物識別の巻物",
	"aggravate-monster-ring": "警報の指輪",
	"protection-ring": "守りの指輪",
	"add-strength-ring": "怪力の指輪",
	"sustain-strength-ring": "持続の指輪",
	"adornment-ring": "飾りの指輪",
	"dexterity-ring": "器用さの指輪",
	"increase-damage-ring": "ダメージの指輪",
	"teleportation-ring": "テレポートの指輪",
	"maintain-armor-ring": "鎧の維持の指輪",
	"restore-strength-potion": "力の回復の薬",
	"extra-healing-potion": "超回復の薬",
	"haste-self-potion": "加速の薬",
	"see-invisible-potion": "透明視の薬",
	"see-invisible-ring": "透明視の指輪",
	"searching-ring": "索敵の指輪",
};

/** What each weapon and armor kind is called — one table for both, since an event only says which EquipmentVariant an item is. */
export const EQUIPMENT_NAMES: Readonly<Record<EquipmentVariant, string>> = {
	mace: "メイス",
	"long-sword": "長剣",
	"short-bow": "弓",
	arrow: "矢",
	dart: "ダーツ",
	shuriken: "手裏剣",
	dagger: "短剣",
	"two-handed-sword": "両手剣",
	spear: "槍",
	"leather-armor": "革鎧",
	"ring-mail": "リングメイル",
	"studded-leather-armor": "鋲革鎧",
	"scale-mail": "スケイルメイル",
	"chain-mail": "チェインメイル",
	"splint-mail": "スプリントメイル",
	"banded-mail": "バンデッドメイル",
	"plate-mail": "プレートメイル",
};

/** The three bolts as the log names them. */
export const BOLT_NAMES: Readonly<Record<BoltKind, string>> = {
	bolt: "電撃",
	flame: "炎",
	ice: "冷気",
};

/** How a death by something other than an enemy reads in the log. */
const NON_ENEMY_DEATH_MESSAGES: Readonly<
	Record<Exclude<DeathCause, EnemyKind>, string>
> = {
	hunger: "空腹のあまり倒れた……",
	trap: "わなにやられた……",
	hypothermia: "凍りついたまま凍え死んだ……",
	bolt: "跳ね返った自分の杖の光線に倒れた……",
};

const isNonEnemyDeathCause = (
	by: DeathCause,
): by is Exclude<DeathCause, EnemyKind> =>
	Object.hasOwn(NON_ENEMY_DEATH_MESSAGES, by);

/** The log line for the player's death — the enemy's name, or NON_ENEMY_DEATH_MESSAGES' line for every other cause. */
export const formatDeathMessage = (by: DeathCause): string =>
	isNonEnemyDeathCause(by)
		? NON_ENEMY_DEATH_MESSAGES[by]
		: `${ENEMY_NAMES[by]}にやられた……`;

export const TRAP_NAMES: Readonly<Record<TrapKind, string>> = {
	trapdoor: "落とし穴",
	arrow: "矢のわな",
	"sleeping-gas": "睡眠ガスのわな",
	bear: "捕獲のわな",
	teleport: "テレポートの罠",
	dart: "毒矢のわな",
	rust: "錆びわな",
	mysterious: "謎のわな",
};

/**
 * The name to show for `kind`: the real name once identified (or for a kind
 * with no generic name), the shared generic name otherwise — this is what
 * makes a potion and a poison potion indistinguishable until drunk or
 * identified, and two rings until one is worn.
 * A weapon or armor is named by `variant` (which one it is) when given.
 */
export const resolveItemDisplayName = (
	kind: ItemKind,
	identifiedItemKinds: readonly ItemKind[],
	variant?: EquipmentVariant,
	appearances?: ItemAppearances,
): string => {
	if (variant !== undefined) {
		return EQUIPMENT_NAMES[variant];
	}
	return IDENTIFIABLE_ITEM_KINDS.includes(kind) &&
		!identifiedItemKinds.includes(kind)
		? resolveUnidentifiedName(kind, appearances)
		: ITEM_NAMES[kind];
};
