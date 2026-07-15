import {
	type EnemyKind,
	type GameEvent,
	type ItemKind,
	POTION_KINDS,
	type TrapKind,
} from "./game/events.js";
import type { InventoryEntry } from "./game/state.js";

const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
	bat: "コウモリ",
};

const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	potion: "回復薬",
	sword: "剣",
	shield: "盾",
	food: "食料",
	poison: "毒薬",
	scroll: "巻物",
	mapping: "地図の巻物",
};

/** Shown for any potion-family item not yet identified this run. */
const UNIDENTIFIED_POTION_NAME = "未鑑定の薬";

const TRAP_NAMES: Readonly<Record<TrapKind, string>> = {
	dart: "矢のわな",
};

/**
 * The name to show for `kind`: the real name once identified (or for any
 * non-potion kind), the shared generic name otherwise — this is what makes
 * a potion and a poison potion indistinguishable until drunk or identified.
 */
const resolveItemDisplayName = (
	kind: ItemKind,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	if (POTION_KINDS.includes(kind) && !identifiedPotionKinds.includes(kind)) {
		return UNIDENTIFIED_POTION_NAME;
	}
	return ITEM_NAMES[kind];
};

// System notices (app/session concerns, never part of GameState). They speak
// in polite style to contrast with the plain style of in-world log lines.

/** Shown when keypresses arrive as full-width characters (IME in full-width mode). */
export const FULL_WIDTH_INPUT_WARNING =
	"全角入力モードになっています。半角入力に切り替えてください";

/** Shown once the shell is writing the suspend save and about to exit. */
export const GAME_SAVED_MESSAGE =
	"セーブしました。次回起動時に続きから再開します";

/** Title line atop the inventory overlay while it's open. */
export const INVENTORY_TITLE = "持ち物(iかEscで閉じる)";

/** Shown inside the inventory overlay when nothing is held. */
export const INVENTORY_EMPTY_MESSAGE = "何も持っていません";

/**
 * One inventory row, e.g. "回復薬 x2" — or "未鑑定の薬 x2" for a potion-family
 * kind not yet identified this run (see identifiedPotionKinds).
 */
export const formatInventoryEntry = (
	entry: InventoryEntry,
	identifiedPotionKinds: readonly ItemKind[],
): string =>
	`${resolveItemDisplayName(entry.kind, identifiedPotionKinds)} x${entry.quantity}`;

/**
 * The single place where game events become human-readable text (Japanese
 * for now). The core (src/game/) never produces strings, so swapping locale
 * means swapping this module only — the i18n discipline in docs/tasks/game.md.
 * `identifiedPotionKinds` is needed only to decide whether item-picked-up
 * should reveal a potion-family kind's real name.
 */
export const formatEvent = (
	event: GameEvent,
	identifiedPotionKinds: readonly ItemKind[],
): string => {
	switch (event.type) {
		case "player-hit":
			return `${ENEMY_NAMES[event.payload.by]}から${event.payload.damage}のダメージを受けた`;
		case "enemy-hit":
			return `${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}のダメージを与えた`;
		case "enemy-defeated":
			return `${ENEMY_NAMES[event.payload.target]}をたおした!`;
		case "player-died":
			if (event.payload.by === "hunger") {
				return "空腹のあまり倒れた……";
			}
			if (event.payload.by === "trap") {
				return "わなにやられた……";
			}
			if (event.payload.by === "poison") {
				return "毒薬を飲んで倒れた……";
			}
			return `${ENEMY_NAMES[event.payload.by]}にやられた……`;
		case "floor-descended":
			return `${event.payload.floor}階に降りた`;
		case "player-healed":
			return event.payload.amount > 0
				? `${ITEM_NAMES[event.payload.by]}を飲んだ。HPが${event.payload.amount}回復した`
				: `${ITEM_NAMES[event.payload.by]}を飲んだが、HPは満タンだった`;
		case "item-picked-up":
			return `${resolveItemDisplayName(event.payload.kind, identifiedPotionKinds)}を拾った`;
		case "game-won":
			return `${event.payload.floor}階に到達し、生還に成功した!`;
		case "weapon-equipped":
			return `${ITEM_NAMES[event.payload.kind]}を装備した。攻撃力が${event.payload.bonus}上がった!`;
		case "armor-equipped":
			return `${ITEM_NAMES[event.payload.kind]}を装備した。防御力が${event.payload.bonus}上がった!`;
		case "player-hungry":
			return "空腹を感じてきた";
		case "player-starved":
			return `空腹で${event.payload.damage}のダメージを受けた`;
		case "player-ate":
			return event.payload.amount > 0
				? `${ITEM_NAMES.food}を食べた。空腹度が${event.payload.amount}回復した`
				: `${ITEM_NAMES.food}を食べたが、空腹度は満タンだった`;
		case "gold-collected":
			return `${event.payload.amount}ゴールドを手に入れた`;
		case "trap-triggered":
			return `${TRAP_NAMES[event.payload.kind]}を踏んでしまった。${event.payload.damage}のダメージを受けた`;
		case "player-poisoned":
			return `毒薬を飲んでしまった。${event.payload.damage}のダメージを受けた`;
		case "player-teleported":
			return "巻物を読んだ。テレポートした!";
		case "floor-mapped":
			return "地図の巻物を読んだ。フロア全体が明らかになった!";
	}
};
