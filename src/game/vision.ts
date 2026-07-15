import { createPreciseShadowcastingFov } from "../fov/index.js";
import { encodePointKey } from "../pointkey.js";
import { BLIND_VIEW_RADIUS } from "./balance.js";
import type { GameState } from "./state.js";

/** How far the player can see, in grid rings (precise shadowcasting). */
const VIEW_RADIUS = 8;

/** The player's current field-of-view radius — shrunk while blind (see BLIND_VIEW_RADIUS). */
export const resolveViewRadius = (state: GameState): number =>
	state.blindTurnsRemaining > 0 ? BLIND_VIEW_RADIUS : VIEW_RADIUS;

/**
 * The set of point keys currently visible from `origin`. Derived from the
 * state on every call — visibility is never stored, only the explored grid
 * is (see GameState.explored). `radius` defaults to the normal VIEW_RADIUS;
 * callers holding a real GameState should pass resolveViewRadius(state)
 * instead so blindness shrinks what they see too.
 */
export const computeVisiblePoints = (
	terrain: GameState["terrain"],
	origin: GameState["player"],
	radius: number = VIEW_RADIUS,
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
