import { stepUniform } from "../rng.js";
import { TRAP_DAMAGE } from "./balance.js";
import { applyBlindnessTick } from "./blindness.js";
import { applyPlayerAttack } from "./combat.js";
import { applyConfusionTick } from "./confusion.js";
import { applyDetectMonstersTick } from "./detectMonsters.js";
import { advanceEnemies } from "./enemies.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { ascendStairs, descendStairs } from "./floor.js";
import { applyHungerTick } from "./hunger.js";
import { addToInventory } from "./inventory.js";
import { applyLevitationTick } from "./levitation.js";
import { applyParalysisTick } from "./paralysis.js";
import { applyRegenerationTick } from "./regeneration.js";
import type { Action, Direction, Enemy, GameState } from "./state.js";
import { applyTrapTeleport } from "./teleport.js";
import { applyUseItem } from "./useItem/index.js";
import { deriveExploredState } from "./vision.js";
import { applyWindsOfKronTick } from "./windsOfKron.js";

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};
const ALL_DIRECTIONS: readonly Direction[] = ["north", "south", "west", "east"];

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
 * Picks up the item under the player's feet into inventory, if any — no
 * longer used immediately (that's the "use-item" action's job).
 */
const applyItemPickup = (state: GameState): GameState => {
	const item = state.items.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (item === undefined) {
		return state;
	}
	return {
		...state,
		inventory: addToInventory(state.inventory, item.kind),
		items: state.items.filter((candidate) => candidate !== item),
		events: buildEventLog(state.events, [
			{ type: "item-picked-up", payload: { kind: item.kind } },
		]),
	};
};

/**
 * Picks up the Amulet of Yendor if it is lying under the player's feet
 * (only possible on GOAL_FLOOR, before it has been taken). Unconditional and
 * immediate, like gold — there is no "use" step, and hasAmulet never turns
 * back off once set.
 */
const applyAmuletPickup = (state: GameState): GameState => {
	if (
		state.amulet === undefined ||
		state.amulet.x !== state.player.x ||
		state.amulet.y !== state.player.y
	) {
		return state;
	}
	return {
		...state,
		amulet: undefined,
		hasAmulet: true,
		events: buildEventLog(state.events, [
			{ type: "amulet-obtained", payload: {} },
		]),
	};
};

/**
 * Adds any gold pile under the player's feet straight to goldCollected — no
 * inventory slot, no use-item step, unlike Item. Picking up gold is
 * unconditional and immediate.
 */
const applyGoldPickup = (state: GameState): GameState => {
	const pile = state.goldPiles.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (pile === undefined) {
		return state;
	}
	return {
		...state,
		goldCollected: state.goldCollected + pile.amount,
		goldPiles: state.goldPiles.filter((candidate) => candidate !== pile),
		events: buildEventLog(state.events, [
			{ type: "gold-collected", payload: { amount: pile.amount } },
		]),
	};
};

/**
 * Springs any hidden trap under the player's feet: TRAP_DAMAGE[kind] damage,
 * the trap consumed (one-time — never re-triggers, never becomes visible).
 * A fatal hit ends the run with player-died(by: "trap"); advanceTurn's move
 * case checks status right after this runs, so enemies never get a same-turn
 * bonus hit on an already-trap-killed player. A trapdoor that the player
 * survives additionally hands the (already trap-triggered) state straight to
 * descendStairs — the whole floor gets replaced exactly as if the player had
 * taken the stairs, GOAL_FLOOR's amulet/up-staircase forcing included. A
 * teleport trap that the player survives (it deals no damage, so always)
 * instead hands off to applyTrapTeleport — same relocation as the teleport
 * scroll, just triggered by a footstep instead of an inventory item. While
 * levitationTurnsRemaining is set, no trap can trigger at all — the player
 * floats over it (any kind alike), and it stays armed underneath.
 */
const applyTrapTrigger = (state: GameState): GameState => {
	if (state.levitationTurnsRemaining > 0) {
		return state;
	}
	const trap = state.traps.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (trap === undefined) {
		return state;
	}
	const damage = TRAP_DAMAGE[trap.kind];
	const playerHp = state.playerHp - damage;
	const events: GameEvent[] = [
		{ type: "trap-triggered", payload: { kind: trap.kind, damage } },
	];
	if (playerHp <= 0) {
		events.push({ type: "player-died", payload: { by: "trap" } });
	}
	const afterTrap: GameState = {
		...state,
		playerHp: Math.max(0, playerHp),
		traps: state.traps.filter((candidate) => candidate !== trap),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
	if (trap.kind === "trapdoor" && afterTrap.status === "playing") {
		return descendStairs(afterTrap);
	}
	if (trap.kind === "teleport" && afterTrap.status === "playing") {
		return applyTrapTeleport(afterTrap);
	}
	return afterTrap;
};

/**
 * A movement turn: bump attack when an enemy occupies the target tile
 * (even one standing on the staircase), transition floors when it is the
 * staircase (direction decides descend vs ascend), walk when it is open
 * floor (picking up any item, gold or the amulet lying there). Bumping a
 * wall consumes no turn (returns the input state, same reference); the
 * other three all do.
 *
 * While confusedTurnsRemaining is set, the intended `direction` is ignored
 * in favor of a uniformly random one (consuming state.rng) — even a wall
 * bump then returns a state with a new rng, so (unlike normal wall bumps)
 * confused stumbling still costs the turn, matching the original's
 * uncertainty around walking while confused.
 */
const applyMove = (state: GameState, direction: Direction): GameState => {
	let effectiveDirection = direction;
	let rng = state.rng;
	if (state.confusedTurnsRemaining > 0) {
		const roll = stepUniform(rng);
		rng = roll.state;
		const picked =
			ALL_DIRECTIONS[Math.floor(roll.value * ALL_DIRECTIONS.length)];
		effectiveDirection = picked ?? direction;
	}
	const stateWithRng = rng === state.rng ? state : { ...state, rng };

	const [deltaX, deltaY] = DIRECTION_VECTORS[effectiveDirection];
	const x = stateWithRng.player.x + deltaX;
	const y = stateWithRng.player.y + deltaY;

	const target = findEnemyAt(stateWithRng, x, y);
	if (target !== undefined) {
		return applyPlayerAttack(stateWithRng, target);
	}
	if (!isFloor(stateWithRng, x, y)) {
		return stateWithRng;
	}
	if (x === stateWithRng.stairs.x && y === stateWithRng.stairs.y) {
		/* the whole floor is replaced, so this floor's enemies never act */
		return stateWithRng.stairs.direction === "up"
			? ascendStairs(stateWithRng)
			: descendStairs(stateWithRng);
	}
	return applyTrapTrigger(
		applyGoldPickup(
			applyAmuletPickup(
				applyItemPickup(
					deriveExploredState({ ...stateWithRng, player: { x, y } }),
				),
			),
		),
	);
};

/**
 * Every status-tick that runs at the end of a turn-consuming action, in a
 * fixed order (hunger, regeneration, confusion, levitation, blindness,
 * paralysis, detect monsters, winds of Kron). Each tick is independently a
 * no-op unless its own field/condition is active, so the order among them
 * does not affect the result.
 */
const applyTurnEndTicks = (state: GameState): GameState =>
	applyWindsOfKronTick(
		applyDetectMonstersTick(
			applyParalysisTick(
				applyBlindnessTick(
					applyLevitationTick(
						applyConfusionTick(applyRegenerationTick(applyHungerTick(state))),
					),
				),
			),
		),
	);

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
			if (state.paralyzedTurnsRemaining > 0) {
				/* Paralyzed: the intended move never happens, but the turn still
				 * passes and enemies still act — same as a wait. */
				return applyTurnEndTicks(advanceEnemies(state));
			}
			const afterPlayer = applyMove(state, action.payload.direction);
			if (afterPlayer === state) {
				return state; /* bumping a wall consumes no turn */
			}
			if (afterPlayer.status !== "playing") {
				return afterPlayer; /* a trap ended the run before enemies could act */
			}
			if (afterPlayer.floor !== state.floor) {
				return applyTurnEndTicks(
					afterPlayer,
				); /* descended — the new floor's enemies wait */
			}
			return applyTurnEndTicks(advanceEnemies(afterPlayer));
		}
		case "wait": {
			/* Stand still for one turn; enemies still act. Without this a
			 * cornered player would soft-lock: bumps consume no turn, so the
			 * enemy turn that would end the run could never arrive. */
			if (state.status !== "playing") {
				return state;
			}
			return applyTurnEndTicks(advanceEnemies(state));
		}
		case "use-item": {
			if (state.status !== "playing") {
				return state;
			}
			if (state.paralyzedTurnsRemaining > 0) {
				/* Paralyzed: cannot use an item either — same as a wait. */
				return applyTurnEndTicks(advanceEnemies(state));
			}
			const afterUse = applyUseItem(state, action.payload.kind);
			if (afterUse === state) {
				return state; /* nothing of that kind held — no turn spent */
			}
			if (afterUse.status !== "playing") {
				return afterUse; /* a poison potion ended the run before enemies could act */
			}
			return applyTurnEndTicks(advanceEnemies(afterUse));
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
