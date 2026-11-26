import { encodePointKey } from "../../pointkey.js";
import { createRng, type Rng } from "../../rng.js";
import {
	WANDERER_DELAY_TURNS,
	WANDERER_ROLL_DIE_SIDES,
	WANDERER_ROLL_INTERVAL_TURNS,
} from "../balance.js";
import { findItemGoal } from "../enemies/enemyPack.js";
import { buildSpawnedEnemy, drawEnemyKindForFloor } from "../floor/enemies.js";
import type { GameState, Position } from "../state.js";
import { findPlayerRoom } from "../vision.js";

/**
 * How long until the wandering-monster rolls start (again): `WANDERER_DELAY_TURNS`
 * give or take — original Rogue's spread(70), i.e. 67 to 73. Consumes `rng` once.
 */
export const drawWandererDelay = (rng: Rng): number =>
	WANDERER_DELAY_TURNS -
	Math.floor(WANDERER_DELAY_TURNS / 20) +
	rng.getUniformInt(0, Math.floor(WANDERER_DELAY_TURNS / 10) - 1);

/** How many tiles original Rogue's wanderer() tries before giving up (its endless-loop guard). */
const WANDERER_PLACEMENT_TRIES = 500;

/**
 * Where a wanderer appears, as original Rogue's wanderer(): a random room
 * (rnd_room()), a random tile inside it (rnd_pos()) that is floor with no
 * monster on it (find_floor()), tried again while that is the player's own
 * room. Corridors never get one, and the room may well be in sight. Gives
 * up — undefined — after WANDERER_PLACEMENT_TRIES tries. Consumes `rng`.
 */
const pickWandererTile = (state: GameState, rng: Rng): Position | undefined => {
	if (state.rooms.length === 0) {
		return undefined;
	}
	const playerRoom = findPlayerRoom(state);
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);
	for (let i = 0; i < WANDERER_PLACEMENT_TRIES; i++) {
		const room = state.rooms[rng.getUniformInt(0, state.rooms.length - 1)];
		if (room === undefined) {
			throw new Error("unreachable: the index is within the room list");
		}
		const tile = {
			x: rng.getUniformInt(room.x1, room.x2),
			y: rng.getUniformInt(room.y1, room.y2),
		};
		if (
			room !== playerRoom &&
			state.terrain[tile.x]?.[tile.y] === 0 &&
			!occupied.has(encodePointKey(tile.x, tile.y))
		) {
			return tile;
		}
	}
	return undefined;
};

/**
 * Original Rogue's wandering monsters (daemons.c's swander/rollwand and
 * monsters.c's wanderer), run at the end of every turn. First
 * wandererDelayTurns counts down. Once it is spent, every
 * WANDERER_ROLL_INTERVAL_TURNS-th turn rolls a WANDERER_ROLL_DIE_SIDES-sided
 * die on state.rng; one face in six brings a new enemy — already awake and
 * coming for the player — into a room other than the player's
 * (pickWandererTile), of a kind drawn for the current floor from the kinds
 * that wander, and starts the delay over. With nowhere to put it, nothing
 * appears and the rolls simply go on. This is what makes resting for natural healing a
 * gamble rather than a free refill. Silent: no event. A no-op once the run
 * is no longer playing.
 */
export const applyWandererTick = (state: GameState): GameState => {
	if (state.status !== "playing") {
		return state;
	}
	if (state.wandererDelayTurns > 0) {
		return { ...state, wandererDelayTurns: state.wandererDelayTurns - 1 };
	}
	const wandererRollTurns = state.wandererRollTurns + 1;
	if (wandererRollTurns < WANDERER_ROLL_INTERVAL_TURNS) {
		return { ...state, wandererRollTurns };
	}

	const rng = createRng(1).setState(state.rng);
	const arrives = rng.getUniformInt(1, WANDERER_ROLL_DIE_SIDES) === 1;
	const position = arrives ? pickWandererTile(state, rng) : undefined;
	if (position === undefined) {
		return { ...state, wandererRollTurns: 0, rng: rng.getState() };
	}
	const kind = drawEnemyKindForFloor(rng, state.floor, "wanderer");
	const spawned = {
		...buildSpawnedEnemy(kind, position, rng, state.floor),
		awake: true,
	};
	/* original Rogue's wanderer() starts it with runto(), which calls find_dest() */
	const goal = findItemGoal(state, spawned, rng);
	const wanderer = goal === undefined ? spawned : { ...spawned, goal };
	return {
		...state,
		enemies: [...state.enemies, wanderer],
		wandererRollTurns: 0,
		wandererDelayTurns: drawWandererDelay(rng),
		rng: rng.getState(),
	};
};
