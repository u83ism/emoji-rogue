import {
	type EnemyKind,
	type EquipmentVariant,
	type ItemKind,
	POTION_KINDS,
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
	rat: "ラット",
	emu: "エミュー",
	kestrel: "ケストレル",
	hobgoblin: "ホブゴブリン",
	centaur: "ケンタウロス",
	quagga: "クアッガ",
	"ur-vile": "アーヴァイル",
	jabberwock: "ジャバウォック",
	griffin: "グリフィン",
	troll: "トロル",
	"icky-thing": "イッキーシング",
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
	"regeneration-ring": "指輪",
	/* Same generic display name as regeneration-ring — which effect it grants only shows once worn. */
	"sustenance-ring": "指輪",
	"enchant-weapon": "武器強化の巻物",
	"enchant-armor": "防具強化の巻物",
	/* Generic display name, like the rings — which effect it grants only shows once used. */
	"striking-wand": "杖",
	confusion: "混乱の薬",
	"slow-wand": "杖",
	levitation: "浮遊の薬",
	"protect-armor": "防具保護の巻物",
	blindness: "盲目の薬",
	paralysis: "麻痺の薬",
	"raise-level": "レベルアップの薬",
	"detect-monster": "索敵の薬",
	life: "生命の薬",
	"remove-curse-scroll": "解呪の巻物",
	/* Same generic display name as the other wands — which effect it grants only shows once used. */
	"teleport-wand": "杖",
	/* Same generic display name as the other rings — which effect it grants only shows once worn. */
	"stealth-ring": "指輪",
	"awareness-ring": "指輪",
	/* Same generic display name as the other wands — which effect it grants only shows once used. */
	"magic-missile-wand": "杖",
	/* Scrolls show their real name immediately, unlike wands/rings — no generic placeholder. */
	"confuse-monster-scroll": "混乱の巻物",
	hallucination: "幻覚の薬",
	"hold-monster-scroll": "束縛の巻物",
	"aggravate-monster-ring": "指輪",
	"sleep-wand": "杖",
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

/** Shown for any potion-family item not yet identified this run. */
const UNIDENTIFIED_POTION_NAME = "未鑑定の薬";

export const TRAP_NAMES: Readonly<Record<TrapKind, string>> = {
	dart: "矢のわな",
	trapdoor: "落とし穴",
	teleport: "テレポートの罠",
	bear: "捕獲のわな",
	rust: "錆びわな",
	"sleeping-gas": "睡眠ガスのわな",
};

/**
 * The name to show for `kind`: the real name once identified (or for any
 * non-potion kind), the shared generic name otherwise — this is what makes
 * a potion and a poison potion indistinguishable until drunk or identified.
 * A weapon or armor is named by `variant` (which one it is) when given.
 */
export const resolveItemDisplayName = (
	kind: ItemKind,
	identifiedPotionKinds: readonly ItemKind[],
	variant?: EquipmentVariant,
): string => {
	if (variant !== undefined) {
		return EQUIPMENT_NAMES[variant];
	}
	if (POTION_KINDS.includes(kind) && !identifiedPotionKinds.includes(kind)) {
		return UNIDENTIFIED_POTION_NAME;
	}
	return ITEM_NAMES[kind];
};
