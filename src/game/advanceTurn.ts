/* file-size-exception: リデューサ本体(applyMove/applyTurnEndTicks/applyItemAction/advanceTurn)の一体性を優先(2026-07-19裁可) */
import { stepUniform } from "../rng.js";
import { applyPlayerAttack, isAdjacent } from "./combat/combat.js";
import { canStepBetween, DIRECTION_VECTORS } from "./directions.js";
import { advanceEnemies } from "./enemies/enemies.js";
import { applyLookWake, applyRoomEntryWake } from "./enemies/wakeMonster.js";
import { buildEventLog } from "./events.js";
import {
	ascendStairs,
	descendStairs,
	resolveStairsRefusal,
} from "./floor/transitions.js";
import { applyItemDrop } from "./items/inventory/drop.js";
import {
	applyAmuletPickup,
	applyGoldPickup,
	applyItemPickup,
} from "./items/inventory/pickups.js";
import { applyUseItem } from "./items/use.js";
import { applySearch, applySearchingRingTick } from "./search.js";
import type { Action, Direction, Enemy, GameState, Position } from "./state.js";
import { applyThrowItem } from "./throw.js";
import { applyTrapTrigger } from "./trapTrigger.js";
import { applyHungerTick } from "./turnEnd/hunger.js";
import { applyRegenerationTick } from "./turnEnd/regeneration.js";
import { applyTeleportationRingTick } from "./turnEnd/ringTeleport.js";
import { applyStatusCountdownTicks } from "./turnEnd/statusCountdowns.js";
import { applyWandererTick } from "./turnEnd/wanderer.js";
import { deriveExploredState, findPlayerRoom } from "./vision.js";

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
 * The venus-flytrap holding the player, if any: original Rogue's ISHELD
 * comes with its first landed bite (flytrapHoldDamage above 0 — see
 * enemies/flytrapHold.ts) and lasts while it stays awake next to them.
 */
const findHoldingFlytrap = (state: GameState): Enemy | undefined =>
	state.flytrapHoldDamage > 0
		? state.enemies.find(
				(enemy) =>
					enemy.kind === "venus-flytrap" &&
					enemy.awake &&
					isAdjacent(enemy, state.player),
			)
		: undefined;

/** A move's result: the next state, and whether it spent the turn (a bump into rock does not). */
interface MoveOutcome {
	readonly state: GameState;
	readonly spent: boolean;
}

/**
 * Original Rogue's rndmove() for a confused player: a random tile among the
 * nine (two rolls, rnd(3) - 1 each), or undefined when that is their own
 * tile, a corner cut, rock, or a monster — then they stay put.
 */
const pickConfusedStep = (
	state: GameState,
): { readonly target: Position | undefined; readonly state: GameState } => {
	const rollY = stepUniform(state.rng);
	const rollX = stepUniform(rollY.state);
	const target = {
		x: state.player.x + Math.floor(rollX.value * 3) - 1,
		y: state.player.y + Math.floor(rollY.value * 3) - 1,
	};
	const rolled = { ...state, rng: rollX.state };
	const bad =
		(target.x === state.player.x && target.y === state.player.y) ||
		!canStepBetween(state.terrain, state.player, target) ||
		!isFloor(state, target.x, target.y) ||
		findEnemyAt(state, target.x, target.y) !== undefined;
	return { target: bad ? undefined : target, state: rolled };
};

/**
 * A movement turn, in any of the eight directions: bump attack when an
 * enemy occupies the target tile, walk when it is open floor (picking up
 * any item, gold or the amulet lying there). Bumping a wall, or a diagonal
 * step cutting a corner (original Rogue's diag_ok()), spends no turn.
 *
 * A venus-flytrap that has bitten holds the player in place (findHoldingFlytrap): every
 * open-floor walk is blocked — logged as player-held — but still spends the
 * turn (original Rogue's "you are being held"). Attacking the flytrap (or
 * anything else) is unaffected, since that resolves as the bump-attack
 * branch above, never reaching this check.
 *
 * While confused, as original Rogue's do_move(): four times in five
 * (rnd(5) != 0) the intended `direction` gives way to pickConfusedStep's
 * random tile — and when that is no good the player stays put, the turn not
 * spent but the rolls are (the returned state carries the new rng).
 */
const applyMove = (state: GameState, direction: Direction): MoveOutcome => {
	let stateWithRng = state;
	let confusedTarget: Position | undefined;
	if (state.confusedTurnsRemaining > 0) {
		const stagger = stepUniform(state.rng);
		stateWithRng = { ...state, rng: stagger.state };
		if (Math.floor(stagger.value * 5) !== 0) {
			const picked = pickConfusedStep(stateWithRng);
			if (picked.target === undefined) {
				return { state: picked.state, spent: false };
			}
			stateWithRng = picked.state;
			confusedTarget = picked.target;
		}
	}

	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const { x, y } = confusedTarget ?? {
		x: stateWithRng.player.x + deltaX,
		y: stateWithRng.player.y + deltaY,
	};
	if (!canStepBetween(stateWithRng.terrain, stateWithRng.player, { x, y })) {
		return { state: stateWithRng, spent: false };
	}

	const target = findEnemyAt(stateWithRng, x, y);
	if (target !== undefined) {
		return { state: applyPlayerAttack(stateWithRng, target), spent: true };
	}
	if (!isFloor(stateWithRng, x, y)) {
		return { state: stateWithRng, spent: false };
	}
	const holdingFlytrap = findHoldingFlytrap(stateWithRng);
	if (holdingFlytrap !== undefined) {
		return {
			state: {
				...stateWithRng,
				events: buildEventLog(stateWithRng.events, [
					{ type: "player-held", payload: { by: holdingFlytrap.kind } },
				]),
			},
			spent: true,
		};
	}
	const walked = deriveExploredState({ ...stateWithRng, player: { x, y } });
	/* stepping in through a door: original Rogue's enter_room() */
	const entered =
		findPlayerRoom(walked) !== undefined &&
		findPlayerRoom(stateWithRng) === undefined
			? applyRoomEntryWake(walked)
			: walked;
	return {
		state: applyTrapTrigger(
			applyGoldPickup(applyAmuletPickup(applyItemPickup(entered))),
		),
		spent: true,
	};
};

/** Counts turnsOnCurrentFloor up by one — see its field doc in state.ts for what consumes it. */
const applyFloorTurnCounterTick = (state: GameState): GameState =>
	state.status === "playing"
		? { ...state, turnsOnCurrentFloor: state.turnsOnCurrentFloor + 1 }
		: state;

/**
 * Everything that runs at the end of a turn-consuming action, in a fixed
 * order: hunger, regeneration, the status countdowns (confusion, levitation,
 * blindness, paralysis, detect monsters, hallucination, haste — see
 * turnEnd/statusCountdowns.ts), the wandering-monster clock
 * (turnEnd/wanderer.ts), then the floor turn counter. Each is independently
 * a no-op unless its own field/condition is active.
 */
const applyTurnEndTicks = (state: GameState): GameState =>
	applySearchingRingTick(
		applyTeleportationRingTick(
			applyFloorTurnCounterTick(
				applyWandererTick(
					applyStatusCountdownTicks(
						applyRegenerationTick(applyHungerTick(state)),
					),
				),
			),
		),
	);

/**
 * The end of one player move: the monsters act and the turn-end ticks run —
 * unless the player is hasted and this was the first of the turn's two
 * moves (original Rogue's command() loops twice under ISHASTE before the
 * monsters and daemons run once).
 */
const endPlayerTurn = (state: GameState): GameState => {
	if (state.hasteTurnsRemaining > 0 && !state.hasteMoveSpent) {
		return { ...state, hasteMoveSpent: true };
	}
	return applyTurnEndTicks(advanceEnemies({ ...state, hasteMoveSpent: false }));
};

/**
 * Shared "spend a turn on an item action" flow for use-item/drop-item/throw-item:
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
		return endPlayerTurn(state);
	}
	const after = apply(state);
	if (after === state) {
		return state;
	}
	if (after.status !== "playing") {
		return after;
	}
	return endPlayerTurn(after);
};

/**
 * Taking the staircase under the player (original Rogue's `>`/`<`): down
 * always, up only with the amulet. A refusal (resolveStairsRefusal) only
 * logs why, spending no turn — as the original's "I see no way down". The
 * whole floor is replaced, so the old floor's enemies never act; ascending
 * out of floor 1 ends the run.
 */
const applyStairs = (state: GameState, direction: "down" | "up"): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	if (state.paralyzedTurnsRemaining > 0) {
		return endPlayerTurn(state);
	}
	const reason = resolveStairsRefusal(state, direction);
	if (reason !== undefined) {
		return {
			...state,
			events: buildEventLog(state.events, [
				{ type: "stairs-refused", payload: { direction, reason } },
			]),
		};
	}
	const after =
		direction === "down" ? descendStairs(state) : ascendStairs(state);
	return after.status === "playing" ? applyTurnEndTicks(after) : after;
};

const reduceAction = (state: GameState, action: Action): GameState => {
	switch (action.type) {
		case "move": {
			if (state.status !== "playing") {
				return state;
			}
			if (state.paralyzedTurnsRemaining > 0) {
				/* Paralyzed: the intended move never happens, but the turn still
				 * passes and enemies still act — same as a wait. */
				return endPlayerTurn(state);
			}
			if (state.stuckTurnsRemaining > 0) {
				/* held by a bear trap (original Rogue's no_move): the move fails, the turn passes */
				return endPlayerTurn({
					...state,
					stuckTurnsRemaining: state.stuckTurnsRemaining - 1,
					events: buildEventLog(state.events, [
						{ type: "player-stuck", payload: {} },
					]),
				});
			}
			const moved = applyMove(state, action.payload.direction);
			if (!moved.spent) {
				return moved.state; /* a bump into rock spends no turn */
			}
			const afterPlayer = moved.state;
			if (afterPlayer.status !== "playing") {
				return afterPlayer; /* a trap ended the run before enemies could act */
			}
			if (afterPlayer.floor !== state.floor) {
				return applyTurnEndTicks(
					afterPlayer,
				); /* fell through a trapdoor — the new floor's enemies wait */
			}
			return endPlayerTurn(afterPlayer);
		}
		case "descend":
			return applyStairs(state, "down");
		case "ascend":
			return applyStairs(state, "up");
		case "search":
			return state.status === "playing"
				? endPlayerTurn(
						state.paralyzedTurnsRemaining > 0 ? state : applySearch(state),
					)
				: state;
		case "wait":
			/* Stand still for one turn; enemies still act. Without this a
			 * cornered player would soft-lock: bumps consume no turn, so the
			 * enemy turn that would end the run could never arrive. */
			return state.status === "playing" ? endPlayerTurn(state) : state;
		case "use-item":
			return applyItemAction(state, (current) =>
				applyUseItem(
					current,
					action.payload.itemId,
					action.payload.targetItemId,
					action.payload.direction,
				),
			);
		case "drop-item":
			return applyItemAction(state, (current) =>
				applyItemDrop(current, action.payload.itemId),
			);
		case "throw-item":
			return applyItemAction(state, (current) =>
				applyThrowItem(
					current,
					action.payload.itemId,
					action.payload.direction,
				),
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

/**
 * The pure game reducer: one action in, the next state out. Same state and
 * action always produce the same result; a blocked move returns the input
 * state unchanged (same reference). After every spent command the monsters
 * next to the player may wake (original Rogue's look(true), which runs
 * before the next command).
 */
export const advanceTurn = (state: GameState, action: Action): GameState => {
	const next = reduceAction(state, action);
	return next === state || next.status !== "playing"
		? next
		: applyLookWake(next);
};
