import { at } from "../indexing.js";
import { createArenaMap } from "../map/arena.js";
import { createRng, seedToState } from "../rng.js";
import {
	PLAYER_MAX_HP,
	PLAYER_START_FOOD,
	PLAYER_START_STRENGTH,
	STARTING_ARROWS_MAX,
	STARTING_ARROWS_MIN,
	WANDERER_DELAY_TURNS,
} from "./balance.js";
import { buildEmptyColumns, buildUnexploredColumns } from "./columns.js";
import { buildFloorLayout } from "./floor/layout.js";
import { buildStartingInventory } from "./startingInventory.js";
import type { GameState, Position, Stairs } from "./state.js";
import { drawWandererDelay } from "./turnEnd/wanderer.js";
import { deriveExploredState } from "./vision.js";

/**
 * The fields every fresh run starts with, identical between the arena
 * fixture and a real dungeon — one place to extend when GameState grows,
 * instead of two diverging literals.
 */
const INITIAL_RUN_STATE = {
	playerHp: PLAYER_MAX_HP,
	playerMaxHp: PLAYER_MAX_HP,
	playerLevel: 1,
	playerExperience: 0,
	playerStrength: PLAYER_START_STRENGTH,
	playerMaxStrength: PLAYER_START_STRENGTH,
	playerFood: PLAYER_START_FOOD,
	confusedTurnsRemaining: 0,
	levitationTurnsRemaining: 0,
	blindTurnsRemaining: 0,
	paralyzedTurnsRemaining: 0,
	playerRunFlag: false,
	hasteTurnsRemaining: 0,
	hasteMoveSpent: false,
	detectMonstersTurnsRemaining: 0,
	hallucinatingTurnsRemaining: 0,
	inventory: [],
	nextItemId: 1,
	identifiedItemKinds: [],
	goldCollected: 0,
	floor: 1,
	deepestFloor: 1,
	turnsOnCurrentFloor: 0,
	quietTurns: 0,
	flytrapHoldDamage: 0,
	floorsWithoutFood: 0,
	wandererDelayTurns: WANDERER_DELAY_TURNS,
	wandererRollTurns: 0,
	hasAmulet: false,
	events: [],
	status: "playing",
} as const satisfies Partial<GameState>;

/**
 * The bottom-right-most floor tile that is not the player's own — a fixed,
 * deterministic staircase spot for the arena fixture. Falls back to the
 * player's tile on a one-tile arena.
 */
const pickArenaStairs = (
	terrain: readonly (readonly number[])[],
	player: Position,
): Stairs => {
	for (let x = terrain.length - 1; x >= 0; x--) {
		const column = terrain[x] ?? [];
		for (let y = column.length - 1; y >= 0; y--) {
			if (column[y] === 0 && !(x === player.x && y === player.y)) {
				return { x, y };
			}
		}
	}
	return { ...player };
};

/**
 * An empty arena (floor everywhere, walls on the perimeter) with the player
 * at the center. Kept as the simplest possible state, mainly for tests.
 * Pure: the same dimensions and seed always produce the same state.
 */
export const buildArenaGameState = (
	width: number,
	height: number,
	seed: number,
): GameState => {
	if (width < 3 || height < 3) {
		throw new Error(
			"unreachable: arena needs room for at least one floor tile",
		);
	}

	const columns = buildEmptyColumns(width);
	createArenaMap(width, height, (x, y, value) => {
		at(columns, x)[y] = value;
	});
	const player: Position = {
		x: Math.floor(width / 2),
		y: Math.floor(height / 2),
	};

	return deriveExploredState({
		...INITIAL_RUN_STATE,
		width,
		height,
		terrain: columns,
		explored: buildUnexploredColumns(width, height),
		player,
		enemies: [],
		items: [],
		goldPiles: [],
		traps: [],
		stairs: pickArenaStairs(columns, player),
		amulet: undefined,
		rng: seedToState(seed),
	});
};

/**
 * A digger-generated dungeon (floor 1) with the player at the center of the
 * first room, carrying buildStartingInventory's kit. The RNG state stored in the result is the state *after*
 * generation consumed it, so later turns — and later floors — continue the
 * same seeded stream; this is what makes a whole run reproducible from
 * (dimensions, seed) alone. Pure: deterministic in its arguments.
 */
export const buildDungeonGameState = (
	width: number,
	height: number,
	seed: number,
): GameState => {
	const rng = createRng(seed);
	const startingInventory = buildStartingInventory(
		rng.getUniformInt(STARTING_ARROWS_MIN, STARTING_ARROWS_MAX),
	);
	const wandererDelayTurns = drawWandererDelay(rng);
	const layout = buildFloorLayout(
		width,
		height,
		rng,
		1,
		false,
		INITIAL_RUN_STATE.nextItemId + startingInventory.length,
		INITIAL_RUN_STATE.floorsWithoutFood,
		true,
	);

	return deriveExploredState({
		...INITIAL_RUN_STATE,
		width,
		height,
		terrain: layout.terrain,
		explored: buildUnexploredColumns(width, height),
		player: layout.player,
		enemies: layout.enemies,
		items: layout.items,
		goldPiles: layout.goldPiles,
		traps: layout.traps,
		stairs: layout.stairs,
		amulet: layout.amulet,
		inventory: startingInventory,
		rng: rng.getState(),
		nextItemId: layout.nextItemId,
		floorsWithoutFood: layout.floorsWithoutFood,
		wandererDelayTurns,
	});
};
