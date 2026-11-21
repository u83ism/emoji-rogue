import { encodePointKey } from "../pointkey.js";
import type { Cell } from "../renderer/index.js";
import { resolveEnemyCell } from "./enemyCells.js";
import {
	AMULET_CELL,
	DEAD_PLAYER_CELL,
	FALLBACK_CELL,
	GOLD_CELL,
	ITEM_GLYPHS,
	PLAYER_CELL,
	REMEMBERED_FLOOR_CELL,
	REMEMBERED_STAIRS_CELL,
	REMEMBERED_WALL_CELL,
	STAIRS_CELL,
	TERRAIN_GLYPHS,
	TRAP_CELL,
	UNEXPLORED_CELL,
	WON_PLAYER_CELL,
} from "./glyphs.js";
import type { GameState, GameStatus } from "./state.js";
import { canSeeInvisible, computePlayerVisiblePoints } from "./vision.js";

const toCell = (
	state: GameState,
	visiblePoints: ReadonlySet<string>,
	x: number,
	y: number,
): Cell => {
	const value = state.terrain[x]?.[y];
	if (visiblePoints.has(encodePointKey(x, y))) {
		return (
			(value !== undefined ? TERRAIN_GLYPHS[value] : undefined) ?? FALLBACK_CELL
		);
	}
	if (state.explored[x]?.[y]) {
		if (x === state.stairs.x && y === state.stairs.y) {
			return REMEMBERED_STAIRS_CELL;
		}
		return value === 1 ? REMEMBERED_WALL_CELL : REMEMBERED_FLOOR_CELL;
	}
	return UNEXPLORED_CELL;
};

/** Which glyph stands on the player's own tile, by run outcome. */
const resolvePlayerCell = (status: GameStatus): Cell => {
	if (status === "dead") {
		return DEAD_PLAYER_CELL;
	}
	if (status === "won") {
		return WON_PLAYER_CELL;
	}
	return PLAYER_CELL;
};

/**
 * The complete frame for one state: three layers (visible terrain in emoji,
 * remembered terrain as silhouettes, unexplored darkness) with the player
 * drawn on top, ready for `<GameScreen>`. Pure — rendering effects stay in
 * the shell (`main.tsx`).
 */
export const buildFrameGrid = (state: GameState): Cell[][] => {
	const visiblePoints = computePlayerVisiblePoints(state);

	const grid: Cell[][] = [];
	for (let y = 0; y < state.height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < state.width; x++) {
			row.push(toCell(state, visiblePoints, x, y));
		}
		grid.push(row);
	}

	/* overlay order = precedence, lowest first: gold < items < amulet < stairs < enemies < player */
	for (const pile of state.goldPiles) {
		if (!visiblePoints.has(encodePointKey(pile.x, pile.y))) {
			continue;
		}
		const goldRow = grid[pile.y];
		if (goldRow !== undefined) {
			goldRow[pile.x] = GOLD_CELL;
		}
	}

	for (const item of state.items) {
		if (!visiblePoints.has(encodePointKey(item.x, item.y))) {
			continue;
		}
		const itemRow = grid[item.y];
		if (itemRow !== undefined) {
			itemRow[item.x] = ITEM_GLYPHS[item.kind];
		}
	}

	if (
		state.amulet !== undefined &&
		visiblePoints.has(encodePointKey(state.amulet.x, state.amulet.y))
	) {
		const amuletRow = grid[state.amulet.y];
		if (amuletRow !== undefined) {
			amuletRow[state.amulet.x] = AMULET_CELL;
		}
	}

	/* a found trap stays drawn — in sight or remembered — under whatever stands on it */
	for (const trap of state.traps) {
		const known =
			visiblePoints.has(encodePointKey(trap.x, trap.y)) ||
			state.explored[trap.x]?.[trap.y] === true;
		const trapRow = grid[trap.y];
		if (trap.seen && known && trapRow !== undefined) {
			trapRow[trap.x] = TRAP_CELL;
		}
	}

	/* the staircase shows while visible; enemies and the player draw over it */
	if (visiblePoints.has(encodePointKey(state.stairs.x, state.stairs.y))) {
		const stairsRow = grid[state.stairs.y];
		if (stairsRow !== undefined) {
			stairsRow[state.stairs.x] = STAIRS_CELL;
		}
	}

	/* enemies are drawn while visible, or unconditionally while detected
	 * (the detect monster potion's timed effect) — except a phantom, which
	 * only shows to a player who can see invisible (original Rogue's
	 * see_monst()), even right next to it — detection shows it too. */
	const detectingMonsters = state.detectMonstersTurnsRemaining > 0;
	const hallucinating = state.hallucinatingTurnsRemaining > 0;
	const seesInvisible = canSeeInvisible(state);
	for (const enemy of state.enemies) {
		const isHiddenPhantom =
			enemy.kind === "phantom" && !detectingMonsters && !seesInvisible;
		if (isHiddenPhantom) {
			continue;
		}
		if (
			!detectingMonsters &&
			!visiblePoints.has(encodePointKey(enemy.x, enemy.y))
		) {
			continue;
		}
		const enemyRow = grid[enemy.y];
		if (enemyRow !== undefined) {
			enemyRow[enemy.x] = resolveEnemyCell(
				enemy,
				hallucinating,
				state.turnsOnCurrentFloor,
			);
		}
	}

	const playerRow = grid[state.player.y];
	if (playerRow === undefined) {
		throw new Error("unreachable: player is always inside the terrain grid");
	}
	playerRow[state.player.x] = resolvePlayerCell(state.status);
	return grid;
};
