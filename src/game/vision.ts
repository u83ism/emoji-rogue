import { createPreciseShadowcastingFov } from "../fov/index.js";
import { encodePointKey } from "../pointkey.js";
import type { GameState } from "./state.js";

/** How far the player can see, in grid rings (precise shadowcasting). */
const VIEW_RADIUS = 8;

/**
 * The set of point keys currently visible from `origin`. Derived from the
 * state on every call — visibility is never stored, only the explored grid
 * is (see GameState.explored).
 */
export const computeVisiblePoints = (
	terrain: GameState["terrain"],
	origin: GameState["player"],
): ReadonlySet<string> => {
	const lightPasses = (x: number, y: number): boolean => terrain[x]?.[y] === 0;
	const fov = createPreciseShadowcastingFov(lightPasses);

	const visible = new Set<string>();
	fov(origin.x, origin.y, VIEW_RADIUS, (x, y, _range, visibility) => {
		if (visibility > 0) {
			visible.add(encodePointKey(x, y));
		}
	});
	return visible;
};

/**
 * The same state with its explored grid extended by everything currently
 * visible. Already-explored cells never become unexplored.
 */
export const deriveExploredState = (state: GameState): GameState => {
	const visiblePoints = computeVisiblePoints(state.terrain, state.player);
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
