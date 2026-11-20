import type { Rng } from "../../rng.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, GameState, Item, Position } from "../state.js";

/**
 * Percent chance a room's monster is generated carrying an item (original
 * Rogue's monsters[].m_carry, give_pack()). Absent kinds carry nothing.
 */
export const ENEMY_CARRY_PERCENT: Readonly<Partial<Record<EnemyKind, number>>> =
	{
		centaur: 15,
		dragon: 100,
		griffin: 20,
		jabberwock: 70,
		medusa: 40,
		nymph: 100,
		orc: 15,
		troll: 50,
		vampire: 20,
		xeroc: 30,
		yeti: 30,
	};

/**
 * Whether a freshly placed room monster of \`kind\` carries an item, as
 * give_pack(): only on the deepest floor reached (\`restocks\`), then its
 * ENEMY_CARRY_PERCENT. Consumes \`rng\` once when it can carry at all.
 */
export const rollsCarriedItem = (
	rng: Rng,
	kind: EnemyKind,
	restocks: boolean,
): boolean => {
	const carryPercent = ENEMY_CARRY_PERCENT[kind] ?? 0;
	return (
		restocks && carryPercent > 0 && rng.getUniformInt(0, 99) < carryPercent
	);
};

const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
	[0, 0],
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
];

/**
 * Where a dropped item lands, like original Rogue's fallpos(): the tile
 * itself or a neighbor that is floor with nothing on it (no item, not the
 * stairs, not the amulet) — undefined when there is none, and the item is
 * lost.
 */
const findDropTile = (
	state: GameState,
	at: Position,
	taken: readonly Item[],
): Position | undefined => {
	for (const [deltaX, deltaY] of NEIGHBOR_OFFSETS) {
		const x = at.x + deltaX;
		const y = at.y + deltaY;
		const free =
			state.terrain[x]?.[y] === 0 &&
			!taken.some((item) => item.x === x && item.y === y) &&
			!(state.stairs.x === x && state.stairs.y === y) &&
			!(state.amulet?.x === x && state.amulet.y === y);
		if (free) {
			return { x, y };
		}
	}
	return undefined;
};

/** A killed monster's pack falls around where it died (original Rogue's remove_mon() with fall()). */
export const applyCarriedItemsDrop = (
	state: GameState,
	enemy: Enemy,
): GameState => {
	if (enemy.carried.length === 0) {
		return state;
	}
	const items = enemy.carried.reduce<readonly Item[]>((placed, item) => {
		const tile = findDropTile(state, enemy, placed);
		return tile === undefined ? placed : [...placed, { ...item, ...tile }];
	}, state.items);
	return { ...state, items };
};
