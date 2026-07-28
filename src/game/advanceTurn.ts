/* file-size-exception: リデューサ本体(applyMove/applyTurnEndTicks/applyItemAction/advanceTurn)の一体性を優先(2026-07-19裁可) */
import { stepUniform } from "../rng.js";
import { applyPlayerAttack, isAdjacent } from "./combat.js";
import { advanceEnemies } from "./enemies.js";
import { buildEventLog } from "./events.js";
import { ascendStairs, descendStairs } from "./floor/transitions.js";
import { applyItemDrop } from "./items/drop.js";
import {
	applyAmuletPickup,
	applyGoldPickup,
	applyItemPickup,
} from "./items/pickups.js";
import { applyUseItem } from "./items/use.js";
import type { Action, Direction, Enemy, GameState } from "./state.js";
import { applyTrapTrigger } from "./trapTrigger.js";
import { applyBlindnessTick } from "./turnEnd/blindness.js";
import { applyConfusionTick } from "./turnEnd/confusion.js";
import { applyDetectMonstersTick } from "./turnEnd/detectMonsters.js";
import { applyHallucinationTick } from "./turnEnd/hallucination.js";
import { applyHungerTick } from "./turnEnd/hunger.js";
import { applyLevitationTick } from "./turnEnd/levitation.js";
import { applyParalysisTick } from "./turnEnd/paralysis.js";
import { applyRegenerationTick } from "./turnEnd/regeneration.js";
import { applyWindsOfKronTick } from "./turnEnd/windsOfKron.js";
import { deriveExploredState } from "./vision.js";

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

/** Awake venus-flytraps currently adjacent to the player — the ones capable of holding it in place this turn. */
const findHoldingFlytraps = (state: GameState): readonly Enemy[] =>
	state.enemies.filter(
		(enemy) =>
			enemy.kind === "venus-flytrap" &&
			enemy.awake &&
			isAdjacent(enemy, state.player),
	);

/**
 * A movement turn: bump attack when an enemy occupies the target tile
 * (even one standing on the staircase), transition floors when it is the
 * staircase (direction decides descend vs ascend), walk when it is open
 * floor (picking up any item, gold or the amulet lying there). Bumping a
 * wall consumes no turn (returns the input state, same reference); the
 * other three all do.
 *
 * An awake venus-flytrap holds the player in place while adjacent: any
 * open-floor walk (including onto the staircase) that would leave every
 * flytrap currently holding it is blocked — logged as player-held — but
 * still spends the turn (struggling wastes the attempt, same as original
 * Rogue). Attacking the flytrap itself is unaffected, since that resolves
 * as the bump-attack branch above, never reaching this check.
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
	const holdingFlytrap = findHoldingFlytraps(stateWithRng).find(
		(flytrap) => !isAdjacent(flytrap, { x, y }),
	);
	if (holdingFlytrap !== undefined) {
		return {
			...stateWithRng,
			events: buildEventLog(stateWithRng.events, [
				{ type: "player-held", payload: { by: holdingFlytrap.kind } },
			]),
		};
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
 * paralysis, detect monsters, hallucination, winds of Kron). Each tick is
 * independently a no-op unless its own field/condition is active, so the
 * order among them does not affect the result.
 */
const applyTurnEndTicks = (state: GameState): GameState =>
	applyWindsOfKronTick(
		applyHallucinationTick(
			applyDetectMonstersTick(
				applyParalysisTick(
					applyBlindnessTick(
						applyLevitationTick(
							applyConfusionTick(applyRegenerationTick(applyHungerTick(state))),
						),
					),
				),
			),
		),
	);

/**
 * Shared "spend a turn on an item action" flow for use-item/drop-item:
 * blocked while not playing, paralyzed acts like a wait, a no-op `apply`
 * spends no turn, and an `apply` ending the run (poison) skips enemies.
 */
const applyItemAction = (
	state: GameState,
	apply: (state: GameState) => GameState,
): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	if (state.paralyzedTurnsRemaining > 0) {
		return applyTurnEndTicks(advanceEnemies(state));
	}
	const after = apply(state);
	if (after === state) {
		return state;
	}
	if (after.status !== "playing") {
		return after;
	}
	return applyTurnEndTicks(advanceEnemies(after));
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
		case "wait":
			/* Stand still for one turn; enemies still act. Without this a
			 * cornered player would soft-lock: bumps consume no turn, so the
			 * enemy turn that would end the run could never arrive. */
			return state.status === "playing"
				? applyTurnEndTicks(advanceEnemies(state))
				: state;
		case "use-item":
			return applyItemAction(state, (current) =>
				applyUseItem(
					current,
					action.payload.itemId,
					action.payload.targetItemId,
				),
			);
		case "drop-item":
			return applyItemAction(state, (current) =>
				applyItemDrop(current, action.payload.itemId),
			);
		case "save":
			/* Only mark the intent — the shell performs the actual file write
			 * when it observes the "suspended" status. Saving is not a game-world
			 * event, so nothing is logged here; the shell shows its own notice. */
			return state.status === "playing"
				? { ...state, status: "suspended" }
				: state;
		case "quit":
			return { ...state, status: "exited" };
	}
};
