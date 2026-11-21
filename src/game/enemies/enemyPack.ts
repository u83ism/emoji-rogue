import type { Rng } from "../../rng.js";
import type { EnemyKind } from "../events.js";
import type { Enemy, GameState, Item, Position } from "../state.js";
import { canSeeEnemy, findPlayerRoom, findRoomAt } from "../vision.js";

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
	const items: Item[] = [...state.items];
	for (const item of enemy.carried) {
		const tile = findDropTile(state, enemy, items);
		if (tile !== undefined) {
			items.push({ ...item, ...tile });
		}
	}
	return { ...state, items };
};

/**
 * Where a monster that has just started moving heads, as original Rogue's
 * find_dest(): a kind that carries things (ENEMY_CARRY_PERCENT), out of the
 * player's room and sight, goes for an item lying in its own room — each
 * item in turn taken with that percent chance, skipping one another monster
 * already heads for. Undefined means the player. Consumes `rng` once per
 * item looked at.
 */
export const findItemGoal = (
	state: GameState,
	enemy: Enemy,
	rng: Rng,
): Position | undefined => {
	const carryPercent = ENEMY_CARRY_PERCENT[enemy.kind] ?? 0;
	const room = findRoomAt(state.rooms, enemy);
	if (
		carryPercent <= 0 ||
		room === undefined ||
		room === findPlayerRoom(state) ||
		canSeeEnemy(state, enemy)
	) {
		return undefined;
	}
	for (const item of state.items) {
		if (findRoomAt(state.rooms, item) !== room) {
			continue;
		}
		if (rng.getUniformInt(0, 99) >= carryPercent) {
			continue;
		}
		const taken = state.enemies.some(
			(other) => other.goal?.x === item.x && other.goal.y === item.y,
		);
		if (!taken) {
			return { x: item.x, y: item.y };
		}
	}
	return undefined;
};

/**
 * Monsters that have reached their goal, as original Rogue's do_chase():
 * one on an item picks it up into its pack and stops (ISRUN off — asleep
 * again here), one on the gold it guards just stops there. A goal with
 * nothing left on it (the player took it) is given up for the player.
 */
export const applyEnemyPickups = (state: GameState): GameState => {
	if (!state.enemies.some((enemy) => enemy.goal !== undefined)) {
		return state;
	}
	let items = state.items;
	const enemies = state.enemies.map((enemy): Enemy => {
		const goal = enemy.goal;
		if (goal === undefined) {
			return enemy;
		}
		const item = items.find(
			(entry) => entry.x === goal.x && entry.y === goal.y,
		);
		const gold = state.goldPiles.some(
			(pile) => pile.x === goal.x && pile.y === goal.y,
		);
		const { goal: _reached, ...rest } = enemy;
		if (item === undefined && !gold) {
			return rest;
		}
		if (enemy.x !== goal.x || enemy.y !== goal.y) {
			return enemy;
		}
		if (item !== undefined) {
			items = items.filter((entry) => entry !== item);
			return { ...rest, awake: false, carried: [...enemy.carried, item] };
		}
		return { ...rest, awake: false };
	});
	return { ...state, enemies, items };
};
