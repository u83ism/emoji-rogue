import type { Action, Direction, GameState } from "./state.js";

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
	state.terrain[x]?.[y] === 0;

const applyMove = (state: GameState, direction: Direction): GameState => {
	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const x = state.player.x + deltaX;
	const y = state.player.y + deltaY;
	if (!isPassable(state, x, y)) {
		return state;
	}
	return { ...state, player: { x, y } };
};

/**
 * The pure game reducer: one action in, the next state out. Same state and
 * action always produce the same result; a blocked move returns the input
 * state unchanged (same reference).
 */
export const advanceTurn = (state: GameState, action: Action): GameState => {
	switch (action.type) {
		case "move":
			return applyMove(state, action.payload.direction);
		case "quit":
			return { ...state, status: "exited" };
	}
};
