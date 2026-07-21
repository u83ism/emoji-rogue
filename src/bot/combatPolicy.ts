import type { Direction, GameState } from "../game/state.js";

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
