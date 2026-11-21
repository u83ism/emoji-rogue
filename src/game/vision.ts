import { createPreciseShadowcastingFov } from "../fov/index.js";
import { encodePointKey } from "../pointkey.js";
import type { DungeonRoom, Enemy, GameState } from "./state.js";

/** How far floor generation looks from the player's start (spawnPool.ts) when keeping monsters out of the first view — generation only. */
export const VIEW_RADIUS = 8;

/** The tiles in line of sight within `radius` of `origin` (precise shadowcasting) — only floor generation's spawn pool still uses this. */
export const computeVisiblePoints = (
	terrain: GameState["terrain"],
	origin: GameState["player"],
	radius: number,
): ReadonlySet<string> => {
	const lightPasses = (x: number, y: number): boolean => terrain[x]?.[y] === 0;
	const fov = createPreciseShadowcastingFov(lightPasses);

	const visible = new Set<string>();
	fov(origin.x, origin.y, radius, (x, y, _range, visibility) => {
		if (visibility > 0) {
			visible.add(encodePointKey(x, y));
		}
	});
	return visible;
};

/** The room whose floor or walls the player stands in (doors included), if any — original Rogue's roomin(). */
export const findPlayerRoom = (state: GameState): DungeonRoom | undefined =>
	state.rooms.find(
		(room) =>
			state.player.x >= room.x1 - 1 &&
			state.player.x <= room.x2 + 1 &&
			state.player.y >= room.y1 - 1 &&
			state.player.y <= room.y2 + 1,
	);

/**
 * What the player sees right now, as original Rogue's cansee(): nothing at
 * all while blind; otherwise the eight tiles around them (LAMPDIST), and —
 * standing in a lit room — that whole room, walls and doors included. A
 * dark room or a corridor shows only the tiles around. Derived on every
 * call — visibility is never stored, only the explored grid is.
 */
export const computePlayerVisiblePoints = (
	state: GameState,
): ReadonlySet<string> => {
	const visible = new Set<string>([
		encodePointKey(state.player.x, state.player.y),
	]);
	if (state.blindTurnsRemaining > 0) {
		return visible;
	}
	for (let x = state.player.x - 1; x <= state.player.x + 1; x++) {
		for (let y = state.player.y - 1; y <= state.player.y + 1; y++) {
			visible.add(encodePointKey(x, y));
		}
	}
	const room = findPlayerRoom(state);
	if (room !== undefined && !room.dark) {
		for (let x = room.x1 - 1; x <= room.x2 + 1; x++) {
			for (let y = room.y1 - 1; y <= room.y2 + 1; y++) {
				visible.add(encodePointKey(x, y));
			}
		}
	}
	return visible;
};

/**
 * The same state with its explored grid extended by everything currently
 * visible — and, as original Rogue's leave_room(), the remembered floor of
 * every dark room the player is not in forgotten again (its walls, doors
 * and the staircase stay remembered).
 */
export const deriveExploredState = (state: GameState): GameState => {
	const visiblePoints = computePlayerVisiblePoints(state);
	const here = findPlayerRoom(state);
	const forgets = (x: number, y: number): boolean =>
		!(x === state.stairs.x && y === state.stairs.y) &&
		state.rooms.some(
			(room) =>
				room.dark &&
				room !== here &&
				x >= room.x1 &&
				x <= room.x2 &&
				y >= room.y1 &&
				y <= room.y2,
		);
	return {
		...state,
		explored: state.explored.map((column, x) =>
			column.map((wasExplored, y) => {
				if (visiblePoints.has(encodePointKey(x, y))) {
					return true;
				}
				return wasExplored && !forgets(x, y);
			}),
		),
	};
};

/**
 * Every enemy currently in the player's field of view — the shared basis for
 * both the single-target wands/scrolls (see findNearestVisibleEnemy) and the
 * area-effect hold monster scroll (items/scrolls.ts).
 */
export const findVisibleEnemies = (state: GameState): readonly Enemy[] => {
	const visiblePoints = computePlayerVisiblePoints(state);
	return state.enemies.filter((enemy) =>
		visiblePoints.has(encodePointKey(enemy.x, enemy.y)),
	);
};

/**
 * The closest (Manhattan distance) enemy currently in the player's field of
 * view, or undefined if none are visible — what the bot aims its missiles at
 * (bot/combatPolicy.ts). The player's own wands and missiles are aimed by
 * direction (throw.ts's traceFlight).
 */
export const findNearestVisibleEnemy = (
	state: GameState,
): Enemy | undefined => {
	const visibleEnemies = findVisibleEnemies(state);
	return visibleEnemies.reduce<Enemy | undefined>((closest, candidate) => {
		if (closest === undefined) {
			return candidate;
		}
		const candidateDistance =
			Math.abs(candidate.x - state.player.x) +
			Math.abs(candidate.y - state.player.y);
		const closestDistance =
			Math.abs(closest.x - state.player.x) +
			Math.abs(closest.y - state.player.y);
		return candidateDistance < closestDistance ? candidate : closest;
	}, undefined);
};

/**
 * Whether invisible monsters (the phantom — original Rogue's ISINVIS) show:
 * only with a see invisible potion running or the ring worn (CANSEE).
 * Detecting monsters shows them regardless (frame.ts).
 */
export const canSeeInvisible = (state: GameState): boolean =>
	state.seeInvisibleTurnsRemaining > 0 ||
	state.inventory.some(
		(item) => item.kind === "see-invisible-ring" && item.equipped,
	);
