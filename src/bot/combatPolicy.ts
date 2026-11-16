import { PLAYER_WEAK_THRESHOLD } from "../game/balance.js";
import type { Direction, GameState } from "../game/state.js";

/** The bot stops to heal while its HP is below this share of max HP (numerator / denominator). */
const REST_HP_NUMERATOR = 2;
const REST_HP_DENOMINATOR = 3;

/**
 * Whether to stand still this turn and let natural healing work
 * (turnEnd/regeneration.ts): HP is below two thirds of max, no enemy on the
 * floor is awake (one that is will come to the player — better met moving
 * than waited for), and there is food to spare. Without this the bot walks
 * from one fight straight into the next and dies of accumulated damage a
 * human player would have slept off.
 */
export const shouldRestToHeal = (state: GameState): boolean =>
	state.playerHp * REST_HP_DENOMINATOR <
		state.playerMaxHp * REST_HP_NUMERATOR &&
	state.playerFood > PLAYER_WEAK_THRESHOLD &&
	state.enemies.every((enemy) => !enemy.awake);

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};
const ALL_DIRECTIONS: readonly Direction[] = ["north", "south", "west", "east"];

/**
 * The direction of an enemy standing right next to the player, if any.
 * Attacking it — awake or still asleep, sleeping ones are a cheap/free
 * sneak-attack kill (see SNEAK_ATTACK_MULTIPLIER) — takes priority over
 * continuing toward the exploration goal: an adjacent enemy attacks every
 * turn regardless of what the player does, so walking past one instead of
 * finishing it off just means taking repeated free hits.
 */
export const findAdjacentEnemyDirection = (
	state: GameState,
): Direction | undefined => {
	for (const direction of ALL_DIRECTIONS) {
		const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
		const x = state.player.x + deltaX;
		const y = state.player.y + deltaY;
		if (state.enemies.some((enemy) => enemy.x === x && enemy.y === y)) {
			return direction;
		}
	}
	return undefined;
};
