import type { RngState } from "../rng.js";

export type Direction = "north" | "south" | "west" | "east";

/**
 * Everything the player (or an AI actor) can do in one turn, as a plain
 * discriminated union. The reducer (`advanceTurn`) is the only interpreter.
 */
export type Action =
	| {
			readonly type: "move";
			readonly payload: { readonly direction: Direction };
	  }
	| { readonly type: "quit" };

export type GameStatus = "playing" | "dead" | "exited";

export interface Position {
	readonly x: number;
	readonly y: number;
}

/**
 * The complete, serializable game state. Contains only data — no functions —
 * so a save file is just `JSON.stringify(state)` and a replay is the initial
 * state plus an action log. The RNG lives here as a value (`rng`), so every
 * turn's randomness is a pure function of the state.
 */
export interface GameState {
	readonly width: number;
	readonly height: number;
	/**
	 * Column-major terrain grid (`terrain[x][y]`), matching the shape every
	 * `map/` generator fills in: 0 = floor, 1 = wall.
	 */
	readonly terrain: readonly (readonly number[])[];
	/**
	 * Column-major grid of cells the player has ever seen. This is real state
	 * (it accumulates over the run); the currently-visible set is not stored —
	 * it is derived from terrain + player on demand (src/game/vision.ts).
	 */
	readonly explored: readonly (readonly boolean[])[];
	readonly player: Position;
	readonly enemies: readonly Position[];
	readonly rng: RngState;
	readonly status: GameStatus;
}
