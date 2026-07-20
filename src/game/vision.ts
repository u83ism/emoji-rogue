import { createPreciseShadowcastingFov } from "../fov/index.js";
import { encodePointKey } from "../pointkey.js";
import { BLIND_VIEW_RADIUS } from "./balance.js";
import type { Enemy, GameState } from "./state.js";

/** How far the player can see, in grid rings (precise shadowcasting). */
export const VIEW_RADIUS = 8;

/** The player's current field-of-view radius — shrunk while blind (see BLIND_VIEW_RADIUS). */
export const resolveViewRadius = (state: GameState): number =>
	state.blindTurnsRemaining > 0 ? BLIND_VIEW_RADIUS : VIEW_RADIUS;

/**
 * The set of point keys currently visible from `origin`. Derived from the
 * state on every call — visibility is never stored, only the explored grid
 * is (see GameState.explored). `radius` is deliberately not defaulted:
 * callers holding a real GameState must pass resolveViewRadius(state) so
 * blindness shrinks what they see too, and a default would let them forget
 * that silently (only radius-independent callers like floor generation pass
 * the plain VIEW_RADIUS).
 */
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

/**
 * The same state with its explored grid extended by everything currently
 * visible. Already-explored cells never become unexplored. Shrinks along
 * with resolveViewRadius while blind — you cannot map what you cannot see.
 */
export const deriveExploredState = (state: GameState): GameState => {
	const visiblePoints = computeVisiblePoints(
		state.terrain,
		state.player,
		resolveViewRadius(state),
	);
	return {
		...state,
		explored: state.explored.map((column, x) =>
			column.map(
				(wasExplored, y) =>
					wasExplored || visiblePoints.has(encodePointKey(x, y)),
			),
		),
	};
};

/**
 * Every enemy currently in the player's field of view — the shared basis for
 * both the single-target wands/scrolls (see findNearestVisibleEnemy) and the
 * area-effect hold monster scroll (items/scrolls.ts).
 */
export const findVisibleEnemies = (state: GameState): readonly Enemy[] => {
	const visiblePoints = computeVisiblePoints(
		state.terrain,
		state.player,
		resolveViewRadius(state),
	);
	return state.enemies.filter((enemy) =>
		visiblePoints.has(encodePointKey(enemy.x, enemy.y)),
	);
};

/**
 * The closest (Manhattan distance) enemy currently in the player's field of
 * view, or undefined if none are visible — a wand's automatic aim, standing
 * in for a manual targeting UI this project deliberately doesn't have
 * (docs/design.md's single-key interaction rule). Shared by items/wands.ts
 * and items/scrolls.ts (moved here from wands.ts once scrolls needed it too
 * — a visibility computation belongs with the rest of vision.ts's logic).
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
