import { at } from "../indexing.js";
import { createDiggerMap } from "../map/digger.js";
import type { Room } from "../map/features.js";
import { getRoomCenter } from "../map/features.js";
import { encodePointKey } from "../pointkey.js";
import { createRng, type Rng } from "../rng.js";
import {
	AQUATOR_SPAWN_CHANCE_PERCENT,
	BLIND_POTION_SPAWN_CHANCE_PERCENT,
	CONFUSION_POTION_SPAWN_CHANCE_PERCENT,
	calculateEnemyCountForFloor,
	DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	ENEMY_MAX_HP,
	FOOD_COUNT_PER_FLOOR,
	GOAL_FLOOR,
	GOLD_AMOUNT_MAX,
	GOLD_AMOUNT_MIN,
	GOLD_PILES_PER_FLOOR,
	IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	LEVITATION_POTION_SPAWN_CHANCE_PERCENT,
	LIFE_POTION_SPAWN_CHANCE_PERCENT,
	MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	MONSTER_HOUSE_ENEMY_COUNT,
	MONSTER_HOUSE_SPAWN_CHANCE_PERCENT,
	NYMPH_SPAWN_CHANCE_PERCENT,
	PARALYSIS_POTION_SPAWN_CHANCE_PERCENT,
	POISON_POTION_SPAWN_CHANCE_PERCENT,
	POTION_COUNT_PER_FLOOR,
	PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	RING_SPAWN_CHANCE_PERCENT,
	SCROLL_SPAWN_CHANCE_PERCENT,
	SHIELD_SPAWN_CHANCE_PERCENT,
	SLOW_WAND_SPAWN_CHANCE_PERCENT,
	STRENGTH_POTION_SPAWN_CHANCE_PERCENT,
	SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	SWORD_SPAWN_CHANCE_PERCENT,
	TELEPORT_TRAP_SPAWN_CHANCE_PERCENT,
	THIEF_SPAWN_CHANCE_PERCENT,
	TRAP_COUNT_PER_FLOOR,
	TRAPDOOR_SPAWN_CHANCE_PERCENT,
	WAND_SPAWN_CHANCE_PERCENT,
} from "./balance.js";
import { buildEmptyColumns, buildUnexploredColumns } from "./columns.js";
import {
	buildEventLog,
	type EnemyKind,
	type GameEvent,
	type ItemKind,
} from "./events.js";
import type {
	Enemy,
	GameState,
	GoldPile,
	Item,
	Position,
	Stairs,
	Trap,
} from "./state.js";
import {
	computeVisiblePoints,
	deriveExploredState,
	VIEW_RADIUS,
} from "./vision.js";

/** Everything one dungeon floor is made of, before it becomes game state. */
export interface FloorLayout {
	readonly terrain: number[][];
	readonly player: Position;
	readonly enemies: readonly Enemy[];
	readonly items: readonly Item[];
	readonly goldPiles: readonly GoldPile[];
	readonly traps: readonly Trap[];
	readonly stairs: Stairs;
	/** Only set when this layout is GOAL_FLOOR — see buildFloorLayout. */
	readonly amulet: Position | undefined;
}

/** One random tile out of the pool, removed from it (no tile spawns twice). */
const drawSpawnTile = (pool: Position[], rng: Rng): Position => {
	const index = rng.getUniformInt(0, pool.length - 1);
	const picked = at(pool, index);
	pool.splice(index, 1);
	return picked;
};

/**
 * Same as drawSpawnTile, but restricted to one room's interior (room.x1..x2,
 * room.y1..y2 are inclusive floor bounds — the walls sit one tile further
 * out). Undefined if the pool has no tile left inside that room — see
 * buildFloorLayout's monster house roll.
 */
const drawSpawnTileInRoom = (
	pool: Position[],
	room: Room,
	rng: Rng,
): Position | undefined => {
	const indexesInRoom = pool
		.map((_, index) => index)
		.filter((index) => {
			const position = at(pool, index);
			return (
				position.x >= room.x1 &&
				position.x <= room.x2 &&
				position.y >= room.y1 &&
				position.y <= room.y2
			);
		});
	if (indexesInRoom.length === 0) {
		return undefined;
	}
	const pickedIndex = at(
		indexesInRoom,
		rng.getUniformInt(0, indexesInRoom.length - 1),
	);
	const picked = at(pool, pickedIndex);
	pool.splice(pickedIndex, 1);
	return picked;
};

/** One independent per-floor percent roll: `kind` spawns when the roll lands. */
interface SpawnChance<Kind> {
	readonly kind: Kind;
	readonly chancePercent: number;
}

/**
 * Chance-rolled enemies — thief/nymph/aquator, which never scale with depth
 * (zombie/bat counts come from calculateEnemyCountForFloor instead). Array
 * order is the exact order the rolls consume `rng`: reordering entries would
 * change every seeded dungeon, so new kinds go at the end.
 */
const ENEMY_SPAWN_TABLE: readonly SpawnChance<EnemyKind>[] = [
	{ kind: "thief", chancePercent: THIEF_SPAWN_CHANCE_PERCENT },
	{ kind: "nymph", chancePercent: NYMPH_SPAWN_CHANCE_PERCENT },
	{ kind: "aquator", chancePercent: AQUATOR_SPAWN_CHANCE_PERCENT },
];

/**
 * Chance-rolled items, one independent roll per entry. Same rng-order caveat
 * as ENEMY_SPAWN_TABLE: the array order is the historical roll order and new
 * kinds go at the end, or every seeded dungeon changes. Guaranteed spawns
 * (healing potions, food, gold, traps) stay outside this table.
 */
const ITEM_SPAWN_TABLE: readonly SpawnChance<ItemKind>[] = [
	{ kind: "sword", chancePercent: SWORD_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-weapon",
		chancePercent: ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "shield", chancePercent: SHIELD_SPAWN_CHANCE_PERCENT },
	{
		kind: "enchant-armor",
		chancePercent: ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "poison", chancePercent: POISON_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "strength", chancePercent: STRENGTH_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "confusion", chancePercent: CONFUSION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "levitation", chancePercent: LEVITATION_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "blindness", chancePercent: BLIND_POTION_SPAWN_CHANCE_PERCENT },
	{ kind: "paralysis", chancePercent: PARALYSIS_POTION_SPAWN_CHANCE_PERCENT },
	{
		kind: "raise-level",
		chancePercent: RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "detect-monster",
		chancePercent: DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "life", chancePercent: LIFE_POTION_SPAWN_CHANCE_PERCENT },
	{
		kind: "protect-armor",
		chancePercent: PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "teleport-scroll", chancePercent: SCROLL_SPAWN_CHANCE_PERCENT },
	{
		kind: "mapping-scroll",
		chancePercent: MAPPING_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{
		kind: "identify-scroll",
		chancePercent: IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "regeneration-ring", chancePercent: RING_SPAWN_CHANCE_PERCENT },
	{
		kind: "sustenance-ring",
		chancePercent: SUSTENANCE_RING_SPAWN_CHANCE_PERCENT,
	},
	{ kind: "striking-wand", chancePercent: WAND_SPAWN_CHANCE_PERCENT },
	{ kind: "slow-wand", chancePercent: SLOW_WAND_SPAWN_CHANCE_PERCENT },
];

/**
 * Floor tiles usable for spawning things away from the player: outside the
 * starting field of view when possible (nothing pops up on screen at turn
 * one), any floor tile except the player's own otherwise (tiny fully-visible
 * maps). Room-independent on purpose: digger occasionally produces a
 * single-room, corridor-heavy dungeon.
 */
const collectSpawnPool = (
	terrain: GameState["terrain"],
	player: Position,
): Position[] => {
	/* the plain VIEW_RADIUS on purpose: at generation time the spawn pool must
	 * hide things from the normal-sighted view, even if the player is
	 * currently blind (blindness fading must not make items pop into sight) */
	const visiblePoints = computeVisiblePoints(terrain, player, VIEW_RADIUS);
	const collectFloorTiles = (outOfSightOnly: boolean): Position[] => {
		const tiles: Position[] = [];
		for (let x = 0; x < terrain.length; x++) {
			const column = terrain[x] ?? [];
			for (let y = 0; y < column.length; y++) {
				if (column[y] !== 0) {
					continue;
				}
				if (x === player.x && y === player.y) {
					continue;
				}
				if (outOfSightOnly && visiblePoints.has(encodePointKey(x, y))) {
					continue;
				}
				tiles.push({ x, y });
			}
		}
		return tiles;
	};

	const candidates = collectFloorTiles(true);
	return candidates.length > 0 ? candidates : collectFloorTiles(false);
};

/**
 * One dungeon floor, generated by consuming (and thereby advancing) `rng`:
 * digger terrain, the player at the center of the first room, zombies and
 * bats (counts scale with `floor`, see balance.ts's
 * `calculateEnemyCountForFloor`), the chance-rolled enemies of
 * ENEMY_SPAWN_TABLE, a staircase, POTION_COUNT_PER_FLOOR healing potions,
 * FOOD_COUNT_PER_FLOOR food rations, the chance-rolled items of
 * ITEM_SPAWN_TABLE, GOLD_PILES_PER_FLOOR gold piles (random amount each) and
 * TRAP_COUNT_PER_FLOOR hidden traps, all drawn from the spawn pool. Nothing
 * shares a tile with anything else unless the pool ran dry (tiny
 * fully-visible maps). `stairsDirection` sets the generated staircase's
 * direction, except on GOAL_FLOOR, where it is always forced to "up" (there
 * is nothing lower) and the Amulet of Yendor spawns instead of nothing —
 * guaranteed, not a percent-chance draw like the other items.
 */
export const buildFloorLayout = (
	width: number,
	height: number,
	rng: Rng,
	floor: number,
	stairsDirection: "up" | "down",
): FloorLayout => {
	const columns = buildEmptyColumns(width);
	const dungeon = createDiggerMap(width, height, rng).create((x, y, value) => {
		at(columns, x)[y] = value;
	});

	const firstRoom = dungeon.getRooms()[0];
	if (firstRoom === undefined) {
		throw new Error("unreachable: digger always digs at least one room");
	}
	const [playerX, playerY] = getRoomCenter(firstRoom);
	const player: Position = { x: playerX, y: playerY };

	const pool = collectSpawnPool(columns, player);
	const enemies: Enemy[] = [];
	const zombieCount = calculateEnemyCountForFloor("zombie", floor);
	for (let i = 0; i < zombieCount && pool.length > 0; i++) {
		enemies.push({
			...drawSpawnTile(pool, rng),
			kind: "zombie",
			hp: ENEMY_MAX_HP.zombie,
			awake: false,
			slowedTurnsRemaining: 0,
		});
	}
	const batCount = calculateEnemyCountForFloor("bat", floor);
	for (let i = 0; i < batCount && pool.length > 0; i++) {
		enemies.push({
			...drawSpawnTile(pool, rng),
			kind: "bat",
			hp: ENEMY_MAX_HP.bat,
			awake: false,
			slowedTurnsRemaining: 0,
		});
	}
	for (const spawn of ENEMY_SPAWN_TABLE) {
		if (pool.length > 0 && rng.getUniformInt(0, 99) < spawn.chancePercent) {
			enemies.push({
				...drawSpawnTile(pool, rng),
				kind: spawn.kind,
				hp: ENEMY_MAX_HP[spawn.kind],
				awake: false,
				slowedTurnsRemaining: 0,
			});
		}
	}

	/*
	 * Monster house: a whole extra room's worth of already-awake enemies,
	 * dumped into one room other than the player's starting room. Unlike
	 * every other spawn above, these start awake — walking in is an ambush,
	 * not a sneak-attack opportunity.
	 */
	const otherRooms = dungeon.getRooms().filter((room) => room !== firstRoom);
	if (
		otherRooms.length > 0 &&
		pool.length > 0 &&
		rng.getUniformInt(0, 99) < MONSTER_HOUSE_SPAWN_CHANCE_PERCENT
	) {
		const monsterHouseRoom = at(
			otherRooms,
			rng.getUniformInt(0, otherRooms.length - 1),
		);
		for (let i = 0; i < MONSTER_HOUSE_ENEMY_COUNT; i++) {
			const tile = drawSpawnTileInRoom(pool, monsterHouseRoom, rng);
			if (tile === undefined) {
				break;
			}
			const kind = i % 2 === 0 ? "zombie" : "bat";
			enemies.push({
				...tile,
				kind,
				hp: ENEMY_MAX_HP[kind],
				awake: true,
				slowedTurnsRemaining: 0,
			});
		}
	}

	const remaining = pool.length > 0 ? pool : collectSpawnPool(columns, player);
	const direction = floor === GOAL_FLOOR ? "up" : stairsDirection;
	const stairs: Stairs = { ...drawSpawnTile(remaining, rng), direction };
	const amulet: Position | undefined =
		floor === GOAL_FLOOR ? drawSpawnTile(remaining, rng) : undefined;

	const items: Item[] = [];
	for (let i = 0; i < POTION_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "heal-potion" });
	}
	for (let i = 0; i < FOOD_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		items.push({ ...drawSpawnTile(remaining, rng), kind: "food" });
	}
	for (const spawn of ITEM_SPAWN_TABLE) {
		if (
			remaining.length > 0 &&
			rng.getUniformInt(0, 99) < spawn.chancePercent
		) {
			items.push({ ...drawSpawnTile(remaining, rng), kind: spawn.kind });
		}
	}

	const goldPiles: GoldPile[] = [];
	for (let i = 0; i < GOLD_PILES_PER_FLOOR && remaining.length > 0; i++) {
		goldPiles.push({
			...drawSpawnTile(remaining, rng),
			amount: rng.getUniformInt(GOLD_AMOUNT_MIN, GOLD_AMOUNT_MAX),
		});
	}

	const traps: Trap[] = [];
	for (let i = 0; i < TRAP_COUNT_PER_FLOOR && remaining.length > 0; i++) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "dart" });
	}
	/* never on GOAL_FLOOR — a trapdoor there would generate a floor beyond it */
	if (
		floor !== GOAL_FLOOR &&
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TRAPDOOR_SPAWN_CHANCE_PERCENT
	) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "trapdoor" });
	}
	/* allowed on GOAL_FLOOR too — it only relocates the player within the floor */
	if (
		remaining.length > 0 &&
		rng.getUniformInt(0, 99) < TELEPORT_TRAP_SPAWN_CHANCE_PERCENT
	) {
		traps.push({ ...drawSpawnTile(remaining, rng), kind: "teleport" });
	}

	return {
		terrain: columns,
		player,
		enemies,
		items,
		goldPiles,
		traps,
		stairs,
		amulet,
	};
};

/**
 * Replaces the current floor with a freshly generated one at `nextFloor`
 * (built with `buildFloorLayout` using `stairsDirection`), carrying over HP,
 * inventory, goldCollected, hasAmulet and the event log; terrain, enemies,
 * items, the staircase, gold piles, traps and the explored grid all start
 * fresh — no floor is ever kept around to revisit. Shared by descendStairs
 * and ascendStairs, which differ only in which direction they move the floor
 * counter and which event they log.
 */
const buildFloorTransition = (
	state: GameState,
	nextFloor: number,
	stairsDirection: "up" | "down",
	event: GameEvent,
): GameState => {
	const rng = createRng(1).setState(state.rng);
	const layout = buildFloorLayout(
		state.width,
		state.height,
		rng,
		nextFloor,
		stairsDirection,
	);
	return deriveExploredState({
		...state,
		terrain: layout.terrain,
		explored: buildUnexploredColumns(state.width, state.height),
		player: layout.player,
		enemies: layout.enemies,
		items: layout.items,
		goldPiles: layout.goldPiles,
		traps: layout.traps,
		stairs: layout.stairs,
		amulet: layout.amulet,
		events: buildEventLog(state.events, [event]),
		rng: rng.getState(),
		floor: nextFloor,
		turnsOnCurrentFloor: 0,
	});
};

/**
 * The next floor down, generated from the state's own RNG so a whole
 * multi-floor run stays reproducible from (dimensions, seed) alone. Pure:
 * deterministic in its argument. GOAL_FLOOR is generated like any other
 * floor (buildFloorLayout forces its staircase to "up" and places the
 * amulet there) — there is no early return here anymore; the run only ends
 * once the player climbs back out, see ascendStairs.
 */
export const descendStairs = (state: GameState): GameState =>
	buildFloorTransition(state, state.floor + 1, "down", {
		type: "floor-descended",
		payload: { floor: state.floor + 1 },
	});

/**
 * The next floor up. Reaching floor 1 or below means the player has
 * surfaced: no floor is generated for it, the run just ends — in victory
 * (game-won) if hasAmulet, otherwise the same "exited" status a manual quit
 * produces (no special event; leaving empty-handed is not a loss, just an
 * early end, as in the original).
 */
export const ascendStairs = (state: GameState): GameState => {
	const nextFloor = state.floor - 1;
	if (nextFloor <= 1) {
		if (!state.hasAmulet) {
			return { ...state, floor: 1, turnsOnCurrentFloor: 0, status: "exited" };
		}
		return {
			...state,
			floor: 1,
			turnsOnCurrentFloor: 0,
			events: buildEventLog(state.events, [{ type: "game-won", payload: {} }]),
			status: "won",
		};
	}
	return buildFloorTransition(state, nextFloor, "up", {
		type: "floor-ascended",
		payload: { floor: nextFloor },
	});
};
