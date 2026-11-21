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
import { computePlayerVisiblePoints } from "../vision.js";

/**
 * How long until the wandering-monster rolls start (again): `WANDERER_DELAY_TURNS`
 * give or take — original Rogue's spread(70), i.e. 67 to 73. Consumes `rng` once.
 */
export const drawWandererDelay = (rng: Rng): number =>
	WANDERER_DELAY_TURNS -
	Math.floor(WANDERER_DELAY_TURNS / 20) +
	rng.getUniformInt(0, Math.floor(WANDERER_DELAY_TURNS / 10) - 1);

/** Every floor tile the player cannot currently see and no enemy stands on — where a wanderer may appear. */
const collectHiddenFreeTiles = (state: GameState): Position[] => {
	const visiblePoints = computePlayerVisiblePoints(state);
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);
	const tiles: Position[] = [];
	for (let x = 0; x < state.terrain.length; x++) {
		const column = state.terrain[x] ?? [];
		for (let y = 0; y < column.length; y++) {
			const key = encodePointKey(x, y);
			if (column[y] === 0 && !visiblePoints.has(key) && !occupied.has(key)) {
				tiles.push({ x, y });
			}
		}
	}
	return tiles;
};

/**
 * Original Rogue's wandering monsters (daemons.c's swander/rollwand and
 * monsters.c's wanderer), run at the end of every turn. First
 * wandererDelayTurns counts down. Once it is spent, every
 * WANDERER_ROLL_INTERVAL_TURNS-th turn rolls a WANDERER_ROLL_DIE_SIDES-sided
 * die on state.rng; one face in six brings a new enemy — already awake and
 * coming for the player — onto a floor tile out of the player's sight, of a
 * kind drawn for the current floor from the kinds that wander, and starts
 * the delay over. With nowhere out of sight to put it, nothing appears and
 * the rolls simply go on. This is what makes resting for natural healing a
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
	const tiles = arrives ? collectHiddenFreeTiles(state) : [];
	if (tiles.length === 0) {
		return { ...state, wandererRollTurns: 0, rng: rng.getState() };
	}
	const position = tiles[rng.getUniformInt(0, tiles.length - 1)];
	if (position === undefined) {
		throw new Error("unreachable: the index is within the tile list");
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
