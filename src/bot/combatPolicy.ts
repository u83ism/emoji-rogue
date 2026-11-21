import { PLAYER_WEAK_THRESHOLD } from "../game/balance.js";
import type { WeaponKind } from "../game/events.js";
import type { Direction, GameState, Position } from "../game/state.js";
import { findNearestVisibleEnemy } from "../game/vision.js";

/** The weapons worth throwing: the ones that need no launcher and hit harder thrown than a punch — best first. */
const THROW_PREFERENCE_ORDER: readonly WeaponKind[] = [
	"shuriken",
	"spear",
	"dagger",
	"dart",
];

/**
 * The direction from the player straight along a row or column to `target`
 * with nothing in between (no wall, no other enemy) — the only throws that
 * can reach it, now that a missile flies where it is aimed (throw.ts).
 */
const resolveClearThrowDirection = (
	state: GameState,
	target: Position,
): Direction | undefined => {
	const deltaX = Math.sign(target.x - state.player.x);
	const deltaY = Math.sign(target.y - state.player.y);
	if (deltaX !== 0 && deltaY !== 0) {
		return undefined;
	}
	const direction = ALL_DIRECTIONS.find((candidate) => {
		const [stepX, stepY] = DIRECTION_VECTORS[candidate];
		return stepX === deltaX && stepY === deltaY;
	});
	if (direction === undefined) {
		return undefined;
	}
	let x = state.player.x + deltaX;
	let y = state.player.y + deltaY;
	while (x !== target.x || y !== target.y) {
		const blocked =
			state.terrain[x]?.[y] !== 0 ||
			state.enemies.some((enemy) => enemy.x === x && enemy.y === y);
		if (blocked) {
			return undefined;
		}
		x += deltaX;
		y += deltaY;
	}
	return direction;
};

/**
 * A missile worth throwing this turn and where: the nearest visible awake
 * enemy two or more tiles away, straight in line with a clear flight
 * (resolveClearThrowDirection), and the first held, unwielded weapon of
 * THROW_PREFERENCE_ORDER.
 */
export const decideWeaponToThrow = (
	state: GameState,
): { readonly itemId: number; readonly direction: Direction } | undefined => {
	const target = findNearestVisibleEnemy(state);
	if (target === undefined || !target.awake) {
		return undefined;
	}
	const distance =
		Math.abs(target.x - state.player.x) + Math.abs(target.y - state.player.y);
	if (distance < 2) {
		return undefined;
	}
	const direction = resolveClearThrowDirection(state, target);
	if (direction === undefined) {
		return undefined;
	}
	for (const weaponKind of THROW_PREFERENCE_ORDER) {
		const held = state.inventory.find(
			(item) =>
				item.kind === "weapon" &&
				item.weaponKind === weaponKind &&
				!item.equipped,
		);
		if (held !== undefined) {
			return { itemId: held.itemId, direction };
		}
	}
	return undefined;
};

/** The bot stops to heal while its HP is below this share of max HP (numerator / denominator). */
const REST_HP_NUMERATOR = 2;
const REST_HP_DENOMINATOR = 3;

/**
 * Whether to stand still this turn and let natural healing work
 * (turnEnd/regeneration.ts): HP is below two thirds of max, no enemy on the
 * floor is awake (one that is will come to the player — better met moving
 * than waited for), and there is food to spare. Without this the bot walks
 * from one fight straight into the next and dies of accumulated damage a
 * human player would have slept off.
 */
export const shouldRestToHeal = (state: GameState): boolean =>
	state.playerHp * REST_HP_DENOMINATOR <
		state.playerMaxHp * REST_HP_NUMERATOR &&
	state.playerFood > PLAYER_WEAK_THRESHOLD &&
	state.enemies.every((enemy) => !enemy.awake);

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};
const ALL_DIRECTIONS: readonly Direction[] = ["north", "south", "west", "east"];

/**
 * The direction of an enemy standing right next to the player, if any.
 * Attacking it — awake or still asleep — takes priority over
 * continuing toward the exploration goal: an adjacent enemy attacks every
 * turn regardless of what the player does, so walking past one instead of
 * finishing it off just means taking repeated free hits.
 */
export const findAdjacentEnemyDirection = (
	state: GameState,
): Direction | undefined => {
	for (const direction of ALL_DIRECTIONS) {
		const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
		const x = state.player.x + deltaX;
		const y = state.player.y + deltaY;
		if (state.enemies.some((enemy) => enemy.x === x && enemy.y === y)) {
			return direction;
		}
	}
	return undefined;
};
