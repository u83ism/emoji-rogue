import { advanceEnemies } from "./enemies.js";
import type { Action, Direction, GameState } from "./state.js";
import { deriveExploredState } from "./vision.js";

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};

/** Passability is derived from terrain data, never stored as a function. */
const isPassable = (state: GameState, x: number, y: number): boolean =>
	state.terrain[x]?.[y] === 0 &&
	!state.enemies.some((enemy) => enemy.x === x && enemy.y === y);

const applyMove = (state: GameState, direction: Direction): GameState => {
	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const x = state.player.x + deltaX;
	const y = state.player.y + deltaY;
	if (!isPassable(state, x, y)) {
		return state;
	}
	return deriveExploredState({ ...state, player: { x, y } });
};

/**
 * The pure game reducer: one action in, the next state out. Same state and
 * action always produce the same result; a blocked move returns the input
 * state unchanged (same reference).
 */
export const advanceTurn = (state: GameState, action: Action): GameState => {
	switch (action.type) {
		case "move": {
			if (state.status !== "playing") {
				return state;
			}
			const afterPlayer = applyMove(state, action.payload.direction);
			if (afterPlayer === state) {
				return state; /* bumping a wall or an enemy consumes no turn */
			}
			return advanceEnemies(afterPlayer);
		}
		case "wait": {
			/* Stand still for one turn; enemies still act. Without this a
			 * cornered player would soft-lock: bumps consume no turn, so the
			 * enemy turn that would end the run could never arrive. */
			if (state.status !== "playing") {
				return state;
			}
			return advanceEnemies(state);
		}
		case "quit":
			return { ...state, status: "exited" };
	}
};
