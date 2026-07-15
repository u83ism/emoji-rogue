import type { RngState } from "../rng.js";
import type { EnemyKind, GameEvent, ItemKind } from "./events.js";

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
	| { readonly type: "wait" }
	| {
			readonly type: "use-item";
			readonly payload: { readonly kind: ItemKind };
	  }
	| { readonly type: "save" }
	| { readonly type: "quit" };

/**
 * "suspended" is the request to suspend-save: the reducer only marks it, and
 * the shell reacts by writing the save file and exiting (no I/O in the core).
 */
export type GameStatus = "playing" | "dead" | "exited" | "suspended" | "won";

export interface Position {
	readonly x: number;
	readonly y: number;
}

/**
 * A live enemy. Intersects Position so existing position-shaped code
 * (pathfinding, drawing) keeps reading `enemy.x` / `enemy.y` directly.
 */
export type Enemy = Position & {
	readonly kind: EnemyKind;
	readonly hp: number;
};

/** An item lying on the floor, waiting to be stepped on. */
export type Item = Position & {
	readonly kind: ItemKind;
};

/** One stack of a held item kind. No capacity limit (yet) — see the backlog. */
export interface InventoryEntry {
	readonly kind: ItemKind;
	readonly quantity: number;
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
	readonly playerHp: number;
	/** Base damage plus any permanent bonus from swords used so far. */
	readonly playerAttackDamage: number;
	readonly enemies: readonly Enemy[];
	readonly items: readonly Item[];
	/** Items picked up but not yet used — stepping on an item no longer uses it immediately. */
	readonly inventory: readonly InventoryEntry[];
	/** 1-based; grows as the player descends. */
	readonly floor: number;
	/**
	 * The down staircase. An entity on top of the (still binary floor/wall)
	 * terrain, like enemies — not a third terrain value, which would ripple
	 * through every passability/visibility/rendering `=== 0` check.
	 */
	readonly stairs: Position;
	/**
	 * Recent combat events, newest last, capped at EVENT_LOG_LIMIT. Pure data
	 * (no strings) — the shell turns these into log lines. Part of the state
	 * so saves and replays reproduce the log.
	 */
	readonly events: readonly GameEvent[];
	readonly rng: RngState;
	readonly status: GameStatus;
}
