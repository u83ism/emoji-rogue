import {
	type EnemyKind,
	type ItemKind,
	POTION_KINDS,
	type TrapKind,
} from "./game/events.js";

// The name dictionaries behind src/messages.ts — same i18n discipline: the
// core never produces strings, and a locale swap touches this pair of files
// only.

export const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
	bat: "コウモリ",
	thief: "盗賊",
	nymph: "ニンフ",
	aquator: "アクエーター",
};

export const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	"heal-potion": "回復薬",
	sword: "剣",
	shield: "盾",
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
};

/** Shown for any potion-family item not yet identified this run. */
const UNIDENTIFIED_POTION_NAME = "未鑑定の薬";

export const TRAP_NAMES: Readonly<Record<TrapKind, string>> = {
	dart: "矢のわな",
	trapdoor: "落とし穴",
	teleport: "テレポートの罠",
};

/**
 * The name to show for `kind`: the real name once identified (or for any
 * non-potion kind), the shared generic name otherwise — this is what makes
 * a potion and a poison potion indistinguishable until drunk or identified.
 */
export const resolveItemDisplayName = (
	kind: ItemKind,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	if (POTION_KINDS.includes(kind) && !identifiedPotionKinds.includes(kind)) {
		return UNIDENTIFIED_POTION_NAME;
	}
	return ITEM_NAMES[kind];
};
