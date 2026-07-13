import type { EnemyKind, GameEvent } from "./game/events.js";

const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
	zombie: "ゾンビ",
};

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
	}
};
