import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import {
	AQUATOR_MAX_HP,
	BAT_MAX_HP,
	MIN_DAMAGE_TAKEN,
	NYMPH_MAX_HP,
	PLAYER_ATTACK_DAMAGE,
	THIEF_MAX_HP,
	ZOMBIE_MAX_HP,
} from "./balance.js";
import { advanceEnemies } from "./enemies.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState } from "./state.js";

const zombie = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake,
});

const bat = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "bat",
	hp: BAT_MAX_HP,
	awake,
});

const thief = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "thief",
	hp: THIEF_MAX_HP,
	awake,
});

const nymph = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "nymph",
	hp: NYMPH_MAX_HP,
	awake,
});

const aquator = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "aquator",
	hp: AQUATOR_MAX_HP,
	awake,
});

/** 9x3 arena: one walkable row at y=1, player at (4,1). */
const buildCorridorState = (enemies: GameState["enemies"]): GameState => ({
	...buildArenaGameState(9, 3, 1),
	enemies,
});

const buildUnexplored7x3 = (): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < 7; x++) {
		columns.push(new Array<boolean>(3).fill(false));
	}
	return columns;
};

describe("advanceEnemies", () => {
	it("a visible enemy chases the player via A*, consuming no rng", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(6, 1)]);
		expect(next.status).toBe("playing");
		expect(next.rng).toEqual(state.rng);
	});

	it("an adjacent enemy attacks in place instead of moving", () => {
		const state = buildCorridorState([zombie(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1)]);
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
		expect(next.status).toBe("playing");
	});

	it("the player's hp reaching zero ends the run", () => {
		const state = { ...buildCorridorState([zombie(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
			{ type: "player-died", payload: { by: "zombie" } },
		]);
	});

	it("enemies stop acting once the run has ended this turn", () => {
		/* two adjacent zombies, 1 hp left: only the first one gets to attack */
		const state = {
			...buildCorridorState([zombie(3, 1), zombie(5, 1)]),
			playerHp: 1,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(3, 1), zombie(5, 1)]);
		expect(
			next.events.filter((event) => event.type === "player-hit").length,
		).toBe(1);
	});

	it("enemies never stack on the same tile", () => {
		/* both chase the player westwards along the single row */
		const state = buildCorridorState([zombie(6, 1), zombie(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1), zombie(6, 1)]);
	});

	it("an unseen enemy wanders, consuming the state's rng", () => {
		/* 7x3 corridor cut by a wall at x=3: the enemy at (5,1) is hidden */
		const state: GameState = {
			width: 7,
			height: 3,
			terrain: [
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
			],
			explored: buildUnexplored7x3(),
			player: { x: 1, y: 1 },
			playerHp: 10,
			playerAttackDamage: PLAYER_ATTACK_DAMAGE,
			playerDefense: 0,
			playerFood: 100,
			hasRingOfRegeneration: false,
			hasRingOfSustenance: false,
			enemies: [zombie(5, 1)],
			items: [],
			inventory: [],
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			stairs: { x: 2, y: 1, direction: "down" },
			amulet: undefined,
			hasAmulet: false,
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = advanceEnemies(state);
		/* (4,1) is the only open neighbor */
		expect(next.enemies).toEqual([zombie(4, 1)]);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("is deterministic: same state in, same state out", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		expect(advanceEnemies(state)).toEqual(advanceEnemies(state));
	});

	it("a bat chases two tiles per player turn (twice a zombie's speed)", () => {
		const state = buildCorridorState([bat(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([bat(5, 1)]);
	});

	it("a bat adjacent to the player attacks twice per turn", () => {
		const state = buildCorridorState([bat(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([bat(5, 1)]);
		expect(next.playerHp).toBe(state.playerHp - 2);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
		]);
	});

	it("a bat's second attack is skipped once it already ended the run", () => {
		const state = { ...buildCorridorState([bat(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "bat", damage: 1 } },
			{ type: "player-died", payload: { by: "bat" } },
		]);
	});

	it("playerDefense reduces incoming damage", () => {
		const state = {
			...buildCorridorState([zombie(5, 1)]),
			playerDefense: 1,
			playerHp: 5,
		};
		const next = advanceEnemies(state);
		/* zombie deals 1; defense would reduce it to 0, but the floor wins */
		expect(next.playerHp).toBe(5 - MIN_DAMAGE_TAKEN);
	});

	it("however high playerDefense climbs, damage never drops below MIN_DAMAGE_TAKEN", () => {
		const state = {
			...buildCorridorState([zombie(5, 1)]),
			playerDefense: 100,
			playerHp: 5,
		};
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(5 - MIN_DAMAGE_TAKEN);
		expect(next.events).toEqual([
			{
				type: "player-hit",
				payload: { by: "zombie", damage: MIN_DAMAGE_TAKEN },
			},
		]);
	});

	it("an adjacent thief steals gold and flees instead of dealing damage", () => {
		const state = {
			...buildCorridorState([thief(5, 1)]),
			goldCollected: 50,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]); /* the thief is gone for good */
		expect(next.playerHp).toBe(state.playerHp); /* no damage taken */
		expect(next.goldCollected).toBe(40);
		expect(next.events).toEqual([
			{ type: "gold-stolen", payload: { amount: 10 } },
		]);
	});

	it("a thief steals no more than the player's remaining gold", () => {
		const state = {
			...buildCorridorState([thief(5, 1)]),
			goldCollected: 3,
		};
		const next = advanceEnemies(state);
		expect(next.goldCollected).toBe(0);
		expect(next.events).toEqual([
			{ type: "gold-stolen", payload: { amount: 3 } },
		]);
	});

	it("a thief still flees when the player has no gold, stealing nothing", () => {
		const state = {
			...buildCorridorState([thief(5, 1)]),
			goldCollected: 0,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]);
		expect(next.goldCollected).toBe(0);
		expect(next.events).toEqual([
			{ type: "gold-stolen", payload: { amount: 0 } },
		]);
	});

	it("a fleeing thief does not affect other enemies acting the same turn", () => {
		const state = {
			...buildCorridorState([thief(3, 1), zombie(5, 1)]),
			goldCollected: 50,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			zombie(5, 1),
		]); /* the thief is gone, the zombie remains */
		expect(next.playerHp).toBe(
			state.playerHp - 1,
		); /* the zombie still attacked */
		expect(next.goldCollected).toBe(40);
	});

	it("an adjacent nymph steals the only held item stack (removed entirely) and flees", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [{ kind: "potion" as const, quantity: 1 }],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]); /* the nymph is gone for good */
		expect(next.playerHp).toBe(state.playerHp); /* no damage taken */
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: "potion" } },
		]);
	});

	it("an adjacent nymph decrements a multi-quantity stack instead of removing it", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [{ kind: "food" as const, quantity: 3 }],
		};
		const next = advanceEnemies(state);
		expect(next.inventory).toEqual([{ kind: "food", quantity: 2 }]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: "food" } },
		]);
	});

	it("an adjacent nymph steals exactly one unit total when several kinds are held", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [
				{ kind: "potion" as const, quantity: 1 },
				{ kind: "sword" as const, quantity: 1 },
			],
		};
		const next = advanceEnemies(state);
		expect(next.inventory.length).toBe(1); /* one stack fully consumed */
		const stolenEvent = next.events.at(-1);
		if (stolenEvent === undefined || stolenEvent.type !== "item-stolen") {
			throw new Error("unreachable: expected an item-stolen event");
		}
		expect(["potion", "sword"]).toContain(stolenEvent.payload.kind);
		expect(
			next.inventory.some((entry) => entry.kind === stolenEvent.payload.kind),
		).toBe(false);
	});

	it("an adjacent nymph still flees with an empty inventory, stealing nothing", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: undefined } },
		]);
	});

	it("a fleeing nymph does not affect other enemies acting the same turn", () => {
		const state = {
			...buildCorridorState([nymph(3, 1), zombie(5, 1)]),
			inventory: [{ kind: "potion" as const, quantity: 1 }],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			zombie(5, 1),
		]); /* the nymph is gone, the zombie remains */
		expect(next.playerHp).toBe(
			state.playerHp - 1,
		); /* the zombie still attacked */
		expect(next.inventory).toEqual([]);
	});

	/*
	 * Whether a landed aquator hit also rusts armor is an
	 * AQUATOR_RUST_CHANCE_PERCENT chance (see balance.ts) — seed 1's first
	 * roll succeeds, seed 1000's fails.
	 */
	it("an adjacent aquator deals damage, stands its ground, and may rust armor", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			aquator(5, 1),
		]); /* stays, unlike thief/nymph */
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.playerDefense).toBe(state.playerDefense - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
			{ type: "armor-rusted", payload: { amount: 1 } },
		]);
	});

	it("an aquator hit that fails its rust roll only deals damage", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1000),
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.playerDefense).toBe(state.playerDefense);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
		]);
	});

	it("only an aquator's hits can rust armor — a zombie never does", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.playerDefense).toBe(state.playerDefense);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
	});

	it("rust from one aquator carries into the next aquator's turn via the shared accumulator", () => {
		/* at seed 1, only the first of these two aquators' rolls succeeds */
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			playerDefense: 5,
			enemies: [aquator(5, 1), aquator(3, 1)],
		};
		const next = advanceEnemies(state);
		const rustedEvents = next.events.filter(
			(event) => event.type === "armor-rusted",
		);
		expect(rustedEvents.length).toBe(1);
		expect(next.playerDefense).toBe(
			4,
		); /* 5 - 1, from the one successful roll */
	});

	it("a sleeping enemy outside the player's view takes no action at all", () => {
		const state: GameState = {
			width: 7,
			height: 3,
			terrain: [
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
				[1, 0, 1],
				[1, 0, 1],
				[1, 1, 1],
			],
			explored: buildUnexplored7x3(),
			player: { x: 1, y: 1 },
			playerHp: 10,
			playerAttackDamage: PLAYER_ATTACK_DAMAGE,
			playerDefense: 0,
			playerFood: 100,
			hasRingOfRegeneration: false,
			hasRingOfSustenance: false,
			enemies: [zombie(5, 1, false)],
			items: [],
			inventory: [],
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			stairs: { x: 2, y: 1, direction: "down" },
			amulet: undefined,
			hasAmulet: false,
			events: [],
			rng: seedToState(1),
			status: "playing",
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1, false)]); /* did not wander */
		expect(next.rng).toEqual(state.rng); /* wandering would have advanced it */
	});

	/*
	 * Waking is a WAKE_CHANCE_PERCENT roll each turn, not guaranteed (see
	 * balance.ts) — buildCorridorState's fixed seed (1) happens to succeed the
	 * very first roll, so these two exercise the "wakes" branch. The "stays
	 * asleep despite being visible/adjacent" branch (the one that leaves room
	 * for a sneak attack) is exercised separately below with a seed whose
	 * first roll fails.
	 */
	it("a sleeping enemy inside the player's field of view wakes and chases the same turn", () => {
		const state = buildCorridorState([zombie(7, 1, false)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(6, 1, true)]);
	});

	it("a sleeping enemy adjacent to the player wakes and attacks the same turn", () => {
		const state = buildCorridorState([zombie(5, 1, false)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1, true)]);
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
	});

	it("a sleeping enemy adjacent to the player can fail its wake roll and stay asleep, taking no action", () => {
		/* seed 678's first WAKE_CHANCE_PERCENT roll fails (see balance.ts) —
		 * this is exactly the window a sneak attack relies on. */
		const state = {
			...buildArenaGameState(9, 3, 678),
			enemies: [zombie(5, 1, false)],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1, false)]);
		expect(next.playerHp).toBe(
			state.playerHp,
		); /* no attack despite adjacency */
		expect(next.events).toEqual([]);
	});
});
