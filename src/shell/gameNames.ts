import {
	type DeathCause,
	type EnemyKind,
	type EquipmentVariant,
	IDENTIFIABLE_ITEM_KINDS,
	type ItemKind,
	POTION_KINDS,
	RING_KINDS,
	type TrapKind,
} from "../game/events.js";

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

export const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	"heal-potion": "回復薬",
	/* The category names — a held or picked-up one is shown by its own kind's name, see EQUIPMENT_NAMES. */
	weapon: "武器",
	armor: "防具",
	food: "食料",
	poison: "毒薬",
	"teleport-scroll": "巻物",
	"mapping-scroll": "地図の巻物",
	"identify-scroll": "識別の巻物",
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
	"awareness-ring": "千里眼の指輪",
	"magic-missile-wand": "魔法の矢の杖",
	/* Scrolls show their real name immediately, unlike potions/rings/wands — no generic placeholder. */
	"confuse-monster-scroll": "混乱の巻物",
	hallucination: "幻覚の薬",
	"hold-monster-scroll": "束縛の巻物",
	"aggravate-monster-ring": "警報の指輪",
};

/**
 * The flavor text for messages.ts's ring-equipped case, one entry per ring
 * kind. A lookup table rather than an if-chain (converted here at the 4th
 * ring — functional-style.md's if-chain limit is 3 branches): the payload's
 * `kind` is the wider ItemKind, so this is a Partial map, not a total one —
 * messages.ts treats a missing entry as unreachable (ring-equipped never
 * fires for a non-ring kind).
 */
export const RING_EQUIPPED_EFFECT: Readonly<Partial<Record<ItemKind, string>>> =
	{
		"regeneration-ring": "じわじわとHPが回復するようになった!",
		"sustenance-ring": "空腹の進みがゆるやかになった!",
		"stealth-ring": "足音が忍びやかになった!",
		"awareness-ring": "敵の気配を常に感じ取れるようになった!",
		"aggravate-monster-ring": "敵の気配に気づかれてしまった!",
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

const UNIDENTIFIED_RING_NAME = "指輪";
const UNIDENTIFIED_WAND_NAME = "杖";

/**
 * The shared generic name each IDENTIFIABLE_ITEM_KINDS kind hides behind
 * until identified this run (see GameState.identifiedItemKinds) — every other
 * kind (scrolls, food, weapon, armor) always shows its real name.
 */
const resolveUnidentifiedName = (kind: ItemKind): string =>
	POTION_KINDS.includes(kind)
		? "未鑑定の薬"
		: RING_KINDS.some((ringKind) => ringKind === kind)
			? UNIDENTIFIED_RING_NAME
			: UNIDENTIFIED_WAND_NAME;

/** How a death by something other than an enemy reads in the log. */
const NON_ENEMY_DEATH_MESSAGES: Readonly<
	Record<Exclude<DeathCause, EnemyKind>, string>
> = {
	hunger: "空腹のあまり倒れた……",
	trap: "わなにやられた……",
	hypothermia: "凍りついたまま凍え死んだ……",
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
	dart: "矢のわな",
	trapdoor: "落とし穴",
	teleport: "テレポートの罠",
	bear: "捕獲のわな",
	rust: "錆びわな",
	"sleeping-gas": "睡眠ガスのわな",
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
): string => {
	if (variant !== undefined) {
		return EQUIPMENT_NAMES[variant];
	}
	return IDENTIFIABLE_ITEM_KINDS.includes(kind) &&
		!identifiedItemKinds.includes(kind)
		? resolveUnidentifiedName(kind)
		: ITEM_NAMES[kind];
};
