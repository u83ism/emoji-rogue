import type { Direction, GameState, Position } from "./state.js";

/** Every direction a step can take — original Rogue's eight (hjkl and yubn). */
export const DIRECTION_VALUES = [
	"north",
	"south",
	"west",
	"east",
	"northwest",
	"northeast",
	"southwest",
	"southeast",
] as const satisfies readonly Direction[];

/** One step's offset per direction. */
export const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
	northwest: [-1, -1],
	northeast: [1, -1],
	southwest: [-1, 1],
	southeast: [1, 1],
};

const isFloor = (
	terrain: GameState["terrain"],
	x: number,
	y: number,
): boolean => terrain[x]?.[y] === 0;

/**
 * Original Rogue's diag_ok(): a step from `from` to the neighboring `to` is
 * allowed unless it is diagonal and cuts a corner — either tile beside it
 * being rock or wall. Straight steps are always allowed (what lies on `to`
 * is the caller's business).
 */
export const canStepBetween = (
	terrain: GameState["terrain"],
	from: Position,
	to: Position,
): boolean =>
	from.x === to.x ||
	from.y === to.y ||
	(isFloor(terrain, to.x, from.y) && isFloor(terrain, from.x, to.y));

/** Whether `left` and `right` touch, diagonals included, and one could step onto the other — where a melee blow lands. */
export const isWithinReach = (
	terrain: GameState["terrain"],
	left: Position,
	right: Position,
): boolean =>
	Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)) === 1 &&
	canStepBetween(terrain, left, right);
