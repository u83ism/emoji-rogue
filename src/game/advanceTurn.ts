import { PLAYER_MAX_HP, POTION_HEAL_AMOUNT } from "./balance.js";
import { applyPlayerAttack } from "./combat.js";
import { advanceEnemies } from "./enemies.js";
import { buildEventLog } from "./events.js";
import { descendStairs } from "./floor.js";
import type { Action, Direction, Enemy, GameState } from "./state.js";
import { deriveExploredState } from "./vision.js";

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};

const findEnemyAt = (
	state: GameState,
	x: number,
	y: number,
): Enemy | undefined =>
	state.enemies.find((enemy) => enemy.x === x && enemy.y === y);

/** Passability is derived from terrain data, never stored as a function. */
const isFloor = (state: GameState, x: number, y: number): boolean =>
	state.terrain[x]?.[y] === 0;

/**
 * Drinks the potion under the player's feet, if any: hp is restored up to
 * the cap, the item is consumed either way (stepping on it at full health
 * wastes it), and the event carries the hp actually gained.
 */
const applyItemPickup = (state: GameState): GameState => {
	const item = state.items.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (item === undefined) {
		return state;
	}
	const amount = Math.min(POTION_HEAL_AMOUNT, PLAYER_MAX_HP - state.playerHp);
	return {
		...state,
		playerHp: state.playerHp + amount,
		items: state.items.filter((candidate) => candidate !== item),
		events: buildEventLog(state.events, [
			{ type: "player-healed", payload: { by: item.kind, amount } },
		]),
	};
};

/**
 * A movement turn: bump attack when an enemy occupies the target tile
 * (even one standing on the staircase), descend when it is the staircase,
 * walk when it is open floor (drinking any potion lying there). Bumping a
 * wall consumes no turn (returns the input state, same reference); the
 * other three all do.
 */
const applyMove = (state: GameState, direction: Direction): GameState => {
	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const x = state.player.x + deltaX;
	const y = state.player.y + deltaY;

	const target = findEnemyAt(state, x, y);
	if (target !== undefined) {
		return applyPlayerAttack(state, target);
	}
	if (!isFloor(state, x, y)) {
		return state;
	}
	if (x === state.stairs.x && y === state.stairs.y) {
		/* the whole floor is replaced, so this floor's enemies never act */
		return descendStairs(state);
	}
	return applyItemPickup(deriveExploredState({ ...state, player: { x, y } }));
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
				return state; /* bumping a wall consumes no turn */
			}
			if (afterPlayer.floor !== state.floor) {
				return afterPlayer; /* descended — the new floor's enemies wait */
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
		case "save": {
			/* Only mark the intent — the shell performs the actual file write
			 * when it observes the "suspended" status. Saving is not a game-world
			 * event, so nothing is logged here; the shell shows its own notice. */
			if (state.status !== "playing") {
				return state;
			}
			return { ...state, status: "suspended" };
		}
		case "quit":
			return { ...state, status: "exited" };
	}
};
