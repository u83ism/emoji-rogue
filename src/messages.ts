import type { EnemyKind, GameEvent, ItemKind } from "./game/events.js";
import type { InventoryEntry } from "./game/state.js";

const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
	bat: "コウモリ",
};

const ITEM_NAMES: Readonly<Record<ItemKind, string>> = {
	potion: "回復薬",
	sword: "剣",
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

/** One inventory row, e.g. "回復薬 x2". */
export const formatInventoryEntry = (entry: InventoryEntry): string =>
	`${ITEM_NAMES[entry.kind]} x${entry.quantity}`;

/**
 * The single place where game events become human-readable text (Japanese
 * for now). The core (src/game/) never produces strings, so swapping locale
 * means swapping this module only — the i18n discipline in docs/tasks/game.md.
 */
export const formatEvent = (event: GameEvent): string => {
	switch (event.type) {
		case "player-hit":
			return `${ENEMY_NAMES[event.payload.by]}から${event.payload.damage}のダメージを受けた`;
		case "enemy-hit":
			return `${ENEMY_NAMES[event.payload.target]}に${event.payload.damage}のダメージを与えた`;
		case "enemy-defeated":
			return `${ENEMY_NAMES[event.payload.target]}をたおした!`;
		case "player-died":
			return `${ENEMY_NAMES[event.payload.by]}にやられた……`;
		case "floor-descended":
			return `${event.payload.floor}階に降りた`;
		case "player-healed":
			return event.payload.amount > 0
				? `${ITEM_NAMES[event.payload.by]}を飲んだ。HPが${event.payload.amount}回復した`
				: `${ITEM_NAMES[event.payload.by]}を飲んだが、HPは満タンだった`;
		case "item-picked-up":
			return `${ITEM_NAMES[event.payload.kind]}を拾った`;
		case "game-won":
			return `${event.payload.floor}階に到達し、生還に成功した!`;
		case "weapon-equipped":
			return `${ITEM_NAMES[event.payload.kind]}を装備した。攻撃力が${event.payload.bonus}上がった!`;
	}
};
