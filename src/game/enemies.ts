import { createAStarPath } from "../path/index.js";
import { encodePointKey } from "../pointkey.js";
import type { RngState } from "../rng.js";
import { stepUniform } from "../rng.js";
import {
	AQUATOR_RUST_CHANCE_PERCENT,
	ENEMY_ACTIONS_PER_TURN,
	ENEMY_ATTACK_DAMAGE,
	MIN_DAMAGE_TAKEN,
	THIEF_STEAL_AMOUNT,
	WAKE_CHANCE_PERCENT,
} from "./balance.js";
import { isAdjacent } from "./combat.js";
import { buildEventLog, type GameEvent } from "./events.js";
import type { Enemy, GameState, InventoryEntry, Position } from "./state.js";
import { computeVisiblePoints } from "./vision.js";

/** Enemies move like the player: 4 directions, floor only. */
const ENEMY_DIRECTIONS: readonly (readonly [number, number])[] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
];

const isFloor = (
	terrain: GameState["terrain"],
	x: number,
	y: number,
): boolean => terrain[x]?.[y] === 0;

/**
 * The next step along the A* path towards the player, or undefined when no
 * useful step exists. Tries an ally-aware route first; when allies block the
 * only route (single-width corridors), falls back to the ally-blind path and
 * queues up behind them if its first step is free.
 * Deterministic: chasing consumes no randomness.
 */
const stepTowardPlayer = (
	state: GameState,
	enemy: Position,
	occupied: ReadonlySet<string>,
): Position | undefined => {
	const computeFirstStep = (avoidAllies: boolean): Position | undefined => {
		const passable = (x: number, y: number): boolean => {
			if (x === state.player.x && y === state.player.y) {
				return true; /* the goal itself */
			}
			if (!isFloor(state.terrain, x, y)) {
				return false;
			}
			return avoidAllies ? !occupied.has(encodePointKey(x, y)) : true;
		};
		const findPath = createAStarPath(state.player.x, state.player.y, passable, {
			topology: 4,
		});

		const points: Position[] = [];
		const result = findPath(enemy.x, enemy.y, (x, y) => {
			points.push({ x, y });
		});
		return result.ok ? points[1] : undefined; /* [0] is the enemy itself */
	};

	const routed = computeFirstStep(true);
	if (routed !== undefined) {
		return routed;
	}
	const queued = computeFirstStep(false);
	if (
		queued !== undefined &&
		!occupied.has(encodePointKey(queued.x, queued.y))
	) {
		return queued;
	}
	return undefined;
};

/** Decrements the stack at `index` by one, dropping it entirely once it hits zero. */
const removeOneFromInventory = (
	inventory: readonly InventoryEntry[],
	index: number,
): readonly InventoryEntry[] =>
	inventory
		.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, quantity: entry.quantity - 1 } : entry,
		)
		.filter((entry) => entry.quantity > 0);

interface WanderStep {
	readonly position: Position;
	readonly rng: RngState;
}

/**
 * One random step (or standing still when boxed in). Wandering never steps
 * onto the player's tile — off-screen enemies do not kill.
 */
const stepWandering = (
	state: GameState,
	enemy: Position,
	occupied: ReadonlySet<string>,
	rng: RngState,
): WanderStep => {
	const options: Position[] = [];
	for (const [deltaX, deltaY] of ENEMY_DIRECTIONS) {
		const x = enemy.x + deltaX;
		const y = enemy.y + deltaY;
		if (x === state.player.x && y === state.player.y) {
			continue;
		}
		if (isFloor(state.terrain, x, y) && !occupied.has(encodePointKey(x, y))) {
			options.push({ x, y });
		}
	}
	if (options.length === 0) {
		return { position: enemy, rng };
	}

	const step = stepUniform(rng);
	const picked = options[Math.floor(step.value * options.length)];
	return { position: picked ?? enemy, rng: step.state };
};

/**
 * One turn for every enemy, in array order. A still-sleeping enemy (see
 * Enemy.awake) takes no action at all unless it wakes this turn: while
 * adjacent to the player, or inside the player's field of view (the same
 * `visiblePoints` set used for the chase decision below, reused as a wake
 * check), it rolls WAKE_CHANCE_PERCENT (consuming the state's RNG) each turn
 * until it succeeds — not a guaranteed wake, so a fast enough attack can
 * still land a sneak attack. Once awake, an enemy never sleeps again. Awake
 * enemies act
 * `ENEMY_ACTIONS_PER_TURN[kind]` times (a fast kind like a bat gets two
 * attacks or two steps for the player's one): adjacent to the player attacks
 * in place (damage from balance.ts by kind, reduced by the (locally
 * accumulated) playerDefense but never below MIN_DAMAGE_TAKEN) — except a
 * thief, which steals up to THIEF_STEAL_AMOUNT gold instead of dealing
 * damage, and a nymph, which steals one random held item stack instead
 * (rng-picked when more than one kind is held; item-stolen fires with kind:
 * undefined if the inventory was empty). Both flee the board for good
 * afterward (never rejoin `nextEnemies`, killed or not). An aquator instead
 * stands its ground: every landed hit additionally rolls
 * AQUATOR_RUST_CHANCE_PERCENT to also knock 1 off playerDefense
 * (armor-rusted), so its later hits in the same fight — this turn's or a
 * future one's — land harder. Non-adjacent
 * enemies chase via A* while inside the player's field of view, or wander
 * using (and advancing) the state's RNG. The player's HP reaching zero ends
 * the run and cuts short any remaining actions, this enemy's and the rest of
 * the array's alike.
 */
export const advanceEnemies = (state: GameState): GameState => {
	if (state.enemies.length === 0) {
		return state;
	}

	const visiblePoints = computeVisiblePoints(state.terrain, state.player);
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);

	let rng = state.rng;
	let playerHp = state.playerHp;
	let goldCollected = state.goldCollected;
	let inventory = state.inventory;
	let playerDefense = state.playerDefense;
	let died = false;
	const events: GameEvent[] = [];
	const nextEnemies: Enemy[] = [];
	for (const enemy of state.enemies) {
		occupied.delete(encodePointKey(enemy.x, enemy.y));

		let awake = enemy.awake;
		if (
			!awake &&
			(isAdjacent(enemy, state.player) ||
				visiblePoints.has(encodePointKey(enemy.x, enemy.y)))
		) {
			const roll = stepUniform(rng);
			rng = roll.state;
			awake = roll.value < WAKE_CHANCE_PERCENT / 100;
		}
		if (!awake) {
			occupied.add(encodePointKey(enemy.x, enemy.y));
			nextEnemies.push(enemy);
			continue;
		}

		let next: Position = enemy;
		let fled = false;
		for (
			let action = 0;
			action < ENEMY_ACTIONS_PER_TURN[enemy.kind] && !died && !fled;
			action++
		) {
			if (isAdjacent(next, state.player)) {
				if (enemy.kind === "thief") {
					const stolen = Math.min(THIEF_STEAL_AMOUNT, goldCollected);
					goldCollected -= stolen;
					events.push({ type: "gold-stolen", payload: { amount: stolen } });
					fled = true;
					continue;
				}
				if (enemy.kind === "nymph") {
					if (inventory.length === 0) {
						events.push({ type: "item-stolen", payload: { kind: undefined } });
					} else {
						const pick = stepUniform(rng);
						rng = pick.state;
						const index = Math.floor(pick.value * inventory.length);
						const entry = inventory[index];
						if (entry === undefined) {
							throw new Error("unreachable: index is within inventory bounds");
						}
						inventory = removeOneFromInventory(inventory, index);
						events.push({ type: "item-stolen", payload: { kind: entry.kind } });
					}
					fled = true;
					continue;
				}
				const damage = Math.max(
					MIN_DAMAGE_TAKEN,
					ENEMY_ATTACK_DAMAGE[enemy.kind] - playerDefense,
				);
				playerHp -= damage;
				events.push({
					type: "player-hit",
					payload: { by: enemy.kind, damage },
				});
				if (enemy.kind === "aquator") {
					const rustRoll = stepUniform(rng);
					rng = rustRoll.state;
					if (rustRoll.value < AQUATOR_RUST_CHANCE_PERCENT / 100) {
						playerDefense -= 1;
						events.push({ type: "armor-rusted", payload: { amount: 1 } });
					}
				}
				if (playerHp <= 0) {
					died = true;
					events.push({ type: "player-died", payload: { by: enemy.kind } });
				}
			} else if (visiblePoints.has(encodePointKey(next.x, next.y))) {
				const step = stepTowardPlayer(state, next, occupied);
				next = step ?? next;
			} else {
				const wandered = stepWandering(state, next, occupied, rng);
				next = wandered.position;
				rng = wandered.rng;
			}
		}

		if (fled) {
			continue;
		}
		occupied.add(encodePointKey(next.x, next.y));
		nextEnemies.push({ ...enemy, x: next.x, y: next.y, awake: true });
	}

	return {
		...state,
		playerHp: Math.max(0, playerHp),
		goldCollected,
		inventory,
		playerDefense,
		enemies: nextEnemies,
		events: buildEventLog(state.events, events),
		rng,
		status: died ? "dead" : state.status,
	};
};
