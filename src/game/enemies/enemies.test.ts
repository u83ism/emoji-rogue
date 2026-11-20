import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import {
	calculateGoldAmountMax,
	GOLD_AMOUNT_MIN,
	MEDUSA_GAZE_CONFUSE_DURATION,
	PLAYER_MAX_HP,
	PLAYER_START_STRENGTH,
	THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
} from "../balance.js";
import type { EnemyKind, GameEvent } from "../events.js";
import { buildArenaGameState } from "../initialState.js";
import { calculatePlayerDefense } from "../items/equipmentStats.js";
import type { Enemy, GameState, HeldItem } from "../state.js";
import { advanceEnemies } from "./enemies.js";

/** An equipped armor HeldItem with the given defenseBonus — the new stand-in for the old playerDefense field. */
const equippedArmor = (
	defenseBonus: number,
	rustProtected = false,
): HeldItem => ({
	itemId: 1,
	kind: "armor",
	equipped: true,
	cursed: false,
	armorKind: "ring-mail" as const,
	defenseBonus,
	rustProtected,
});

/**
 * Worn by the player in every test that needs an attack to land for sure:
 * an armor class this bad puts every kind's to-hit chance at 100%. Its
 * opposite, equippedArmor(100), makes every attack miss.
 */
const EXPOSING_ARMOR = equippedArmor(-20);

/** Every fixture enemy's max HP — far more than any single test hit removes. */
const TEST_ENEMY_HP = 30;

const enemyOf = (
	kind: EnemyKind,
	x: number,
	y: number,
	awake = true,
	hp = TEST_ENEMY_HP,
): Enemy => ({
	x,
	y,
	kind,
	hp,
	maxHp: TEST_ENEMY_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const zombie = (x: number, y: number, awake = true): Enemy =>
	enemyOf("zombie", x, y, awake);
const bat = (x: number, y: number, awake = true): Enemy =>
	enemyOf("bat", x, y, awake);
const thief = (x: number, y: number, awake = true): Enemy =>
	enemyOf("thief", x, y, awake);
const nymph = (x: number, y: number, awake = true): Enemy =>
	enemyOf("nymph", x, y, awake);
const aquator = (x: number, y: number, awake = true): Enemy =>
	enemyOf("aquator", x, y, awake);
const vampire = (x: number, y: number, hp = TEST_ENEMY_HP): Enemy =>
	enemyOf("vampire", x, y, true, hp);
const troll = (x: number, y: number, hp = TEST_ENEMY_HP): Enemy =>
	enemyOf("troll", x, y, true, hp);
const iceMonster = (x: number, y: number, awake = true): Enemy =>
	enemyOf("ice-monster", x, y, awake);
const venusFlytrap = (x: number, y: number): Enemy =>
	enemyOf("venus-flytrap", x, y);
const medusa = (x: number, y: number): Enemy => enemyOf("medusa", x, y);
const wraith = (x: number, y: number): Enemy => enemyOf("wraith", x, y);

/** The damage of every player-hit event, in order. */
const collectHitDamages = (events: readonly GameEvent[]): number[] =>
	events.flatMap((event) =>
		event.type === "player-hit" ? [event.payload.damage] : [],
	);

/**
 * The first rng state (walking one seed's stream) for which `isWanted`
 * holds — seed hunting done in code, so a test that needs a particular roll
 * outcome states the outcome instead of a magic seed number.
 */
const findRngState = (isWanted: (rng: RngState) => boolean): RngState => {
	let current = seedToState(1);
	for (let attempt = 0; attempt < 5000; attempt++) {
		if (isWanted(current)) {
			return current;
		}
		current = stepUniform(current).state;
	}
	throw new Error("no rng state in the first 5000 satisfies the test");
};

/** 9x3 arena: one walkable row at y=1, player at (4,1). */
/**
 * 60 well-spread rng states: one seed stepped 0..59 times. Neighboring small
 * seeds are no good for this — their first uniform draws are all close to 0.
 */
const buildSpreadRngStates = (): readonly RngState[] => {
	const states: RngState[] = [];
	let current = seedToState(1);
	for (let i = 0; i < 60; i++) {
		states.push(current);
		current = stepUniform(current).state;
	}
	return states;
};

const buildCorridorState = (enemies: GameState["enemies"]): GameState => ({
	...buildArenaGameState(9, 3, 1),
	enemies,
});

/** buildCorridorState with the player wearing EXPOSING_ARMOR (every attack lands) and enough HP to survive any one turn. */
const buildExposedState = (enemies: GameState["enemies"]): GameState => ({
	...buildCorridorState(enemies),
	inventory: [EXPOSING_ARMOR],
	playerHp: 200,
	playerMaxHp: 200,
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
		const state = buildExposedState([zombie(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1)]);
		const [damage] = collectHitDamages(next.events);
		/* a zombie rolls 1d8 */
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(8);
		expect(next.playerHp).toBe(state.playerHp - (damage ?? 0));
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage } },
		]);
		expect(next.status).toBe("playing");
	});

	it("the player's hp reaching zero ends the run", () => {
		const state = { ...buildExposedState([zombie(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events.map((event) => event.type)).toEqual([
			"player-hit",
			"player-died",
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
			playerMaxHp: PLAYER_MAX_HP,
			playerLevel: 1,
			playerExperience: 0,
			playerStrength: PLAYER_START_STRENGTH,
			playerMaxStrength: PLAYER_START_STRENGTH,
			playerFood: 100,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			blindTurnsRemaining: 0,
			paralyzedTurnsRemaining: 0,
			detectMonstersTurnsRemaining: 0,
			hallucinatingTurnsRemaining: 0,
			enemies: [zombie(5, 1)],
			items: [],
			inventory: [],
			nextItemId: 1,
			identifiedItemKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			deepestFloor: 1,
			turnsOnCurrentFloor: 0,
			quietTurns: 0,
			flytrapHoldDamage: 0,
			floorsWithoutFood: 0,
			wandererDelayTurns: 70,
			wandererRollTurns: 0,
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

	it("a flying kind still away from the player moves twice in a turn", () => {
		const state = buildCorridorState([enemyOf("kestrel", 7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([enemyOf("kestrel", 5, 1)]);
		expect(next.rng).toEqual(state.rng);
	});

	it("a flier whose first move brings it next to the player stops there, with no free attack", () => {
		const state = buildExposedState([enemyOf("kestrel", 6, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([enemyOf("kestrel", 5, 1)]);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([]);
	});

	it("an adjacent flier attacks once a turn like anything else", () => {
		const state = buildExposedState([enemyOf("kestrel", 5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([enemyOf("kestrel", 5, 1)]);
		expect(collectHitDamages(next.events).length).toBe(1);
	});

	it("a bat next to the player flutters off instead of biting about half the time", () => {
		const outcomes = buildSpreadRngStates().map((rng) => {
			const state = { ...buildExposedState([bat(5, 1)]), rng };
			const next = advanceEnemies(state);
			const bit = collectHitDamages(next.events).length > 0;
			/* a bat that bit stayed put; one that fluttered took no bite */
			expect(bit).toBe(next.playerHp < state.playerHp);
			if (bit) {
				expect(next.enemies).toEqual([bat(5, 1)]);
			}
			return bit;
		});
		const bites = outcomes.filter((bit) => bit).length;
		expect(bites).toBeGreaterThan(outcomes.length / 4);
		expect(bites).toBeLessThan((outcomes.length * 3) / 4);
	});

	it("a phantom lurches off too, but only now and then", () => {
		const attacks = buildSpreadRngStates().filter((rng) => {
			const state = { ...buildExposedState([enemyOf("phantom", 5, 1)]), rng };
			return collectHitDamages(advanceEnemies(state).events).length > 0;
		}).length;
		expect(attacks).toBeGreaterThan(36); /* well over half of 60 */
		expect(attacks).toBeLessThan(60); /* but not every time */
	});

	it("a kind that is neither erratic nor flying consumes no rng to chase", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		expect(advanceEnemies(state).rng).toEqual(state.rng);
	});

	it("a kind with several attacks rolls each of them every turn, logged as one summed hit", () => {
		/* a troll attacks 1d8/1d8/2d6 — all three landing totals 4..28 */
		const state = buildExposedState([troll(5, 1)]);
		const next = advanceEnemies(state);
		const damages = collectHitDamages(next.events);
		expect(damages.length).toBe(1);
		const [damage = 0] = damages;
		expect(damage).toBeGreaterThanOrEqual(4);
		expect(damage).toBeLessThanOrEqual(28);
		expect(next.playerHp).toBe(state.playerHp - damage);
	});

	it("the remaining attacks are skipped once one of them already ended the run", () => {
		const state = { ...buildExposedState([troll(5, 1)]), playerHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events.map((event) => event.type)).toEqual([
			"player-hit",
			"player-died",
		]);
	});

	it("armor only makes attacks miss — a failed to-hit roll deals no damage and logs enemy-attack-missed instead of player-hit", () => {
		const state = {
			...buildCorridorState([troll(5, 1)]),
			inventory: [equippedArmor(100)],
		};
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(state.playerHp);
		/* three failed to-hit rolls, one log line */
		expect(next.events).toEqual([
			{ type: "enemy-attack-missed", payload: { by: "troll" } },
		]);
	});

	it("a landed hit deals its dice in full, whatever the armor", () => {
		/* each of a quagga's two bites that lands is a full 1d5, never reduced by armor */
		const state = buildExposedState([enemyOf("quagga", 5, 1)]);
		const damages = collectHitDamages(advanceEnemies(state).events);
		expect(damages.length).toBe(1);
		const [damage = 0] = damages;
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(10);
	});

	it("an adjacent thief steals gold and flees instead of dealing damage", () => {
		const state = {
			...buildCorridorState([thief(5, 1)]),
			goldCollected: 50,
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]); /* the thief is gone for good */
		expect(next.playerHp).toBe(state.playerHp); /* no damage taken */
		const stolen = state.goldCollected - next.goldCollected;
		expect(stolen).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
		expect(next.events).toEqual([
			{ type: "gold-stolen", payload: { amount: stolen } },
		]);
	});

	it("a thief steals one gold pile's worth on a passed magic save, up to five piles' worth on a failed one", () => {
		const thefts = buildSpreadRngStates().map((rng) => {
			const state = {
				...buildCorridorState([thief(5, 1)]),
				rng,
				goldCollected: 1000,
			};
			return state.goldCollected - advanceEnemies(state).goldCollected;
		});
		for (const stolen of thefts) {
			expect(stolen).toBeGreaterThanOrEqual(GOLD_AMOUNT_MIN);
			expect(stolen).toBeLessThanOrEqual(
				calculateGoldAmountMax(1) * THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME,
			);
		}
		/* a level-1 player fails the save most of the time (80%) but not always */
		const bigThefts = thefts.filter(
			(stolen) => stolen > calculateGoldAmountMax(1),
		);
		expect(bigThefts.length).toBeGreaterThan(thefts.length / 2);
		expect(bigThefts.length).toBeLessThan(thefts.length);
	});

	it("a higher-level player passes the magic save more often, so loses less on average", () => {
		const totalStolenAtLevel = (playerLevel: number): number =>
			buildSpreadRngStates()
				.map((rng) => {
					const state = {
						...buildCorridorState([thief(5, 1)]),
						rng,
						goldCollected: 1000,
						playerLevel,
					};
					return state.goldCollected - advanceEnemies(state).goldCollected;
				})
				.reduce((total, stolen) => total + stolen, 0);
		expect(totalStolenAtLevel(10)).toBeLessThan(totalStolenAtLevel(1));
	});

	it("a thief steals no more than the player's remaining gold", () => {
		const state = {
			...buildCorridorState([thief(5, 1)]),
			goldCollected: 1,
		};
		const next = advanceEnemies(state);
		expect(next.goldCollected).toBe(0);
		expect(next.events).toEqual([
			{ type: "gold-stolen", payload: { amount: 1 } },
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
		expect(next.rng).toEqual(state.rng); /* nothing to roll for */
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
		/* the zombie still got its attack attempt (hit or miss) */
		expect(
			next.events.some(
				(event) =>
					(event.type === "player-hit" ||
						event.type === "enemy-attack-missed") &&
					event.payload.by === "zombie",
			),
		).toBe(true);
		expect(next.goldCollected).toBeLessThan(state.goldCollected);
	});

	it("an adjacent nymph steals the only held item slot and flees", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [{ itemId: 1, kind: "heal-potion" } as const],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]); /* the nymph is gone for good */
		expect(next.playerHp).toBe(state.playerHp); /* no damage taken */
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: "heal-potion" } },
		]);
	});

	it("an adjacent nymph steals one slot when several of the same kind are held, leaving the rest", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [
				{ itemId: 1, kind: "food" } as const,
				{ itemId: 2, kind: "food" } as const,
				{ itemId: 3, kind: "food" } as const,
			],
		};
		const next = advanceEnemies(state);
		/* which itemId is picked depends on the rng roll, but every candidate
		 * is a "food" entry, so the observable result is the same either way */
		expect(next.inventory.length).toBe(2);
		expect(next.inventory.every((item) => item.kind === "food")).toBe(true);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: "food" } },
		]);
	});

	it("an adjacent nymph steals exactly one slot total when several kinds are held", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [
				{ itemId: 1, kind: "heal-potion" } as const,
				{
					itemId: 2,
					kind: "weapon",
					equipped: false,
					cursed: false,
					weaponKind: "long-sword" as const,
					hitBonus: 1,
					damageBonus: 1,
					quantity: 1,
				} as const,
			],
		};
		const next = advanceEnemies(state);
		expect(next.inventory.length).toBe(1); /* one slot consumed */
		const stolenEvent = next.events.at(-1);
		if (stolenEvent === undefined || stolenEvent.type !== "item-stolen") {
			throw new Error("unreachable: expected an item-stolen event");
		}
		expect(["heal-potion", "weapon"]).toContain(stolenEvent.payload.kind);
		expect(
			next.inventory.some((item) => item.kind === stolenEvent.payload.kind),
		).toBe(false);
	});

	it("an adjacent nymph never steals an equipped item, even alongside unequipped ones", () => {
		/* the only unequipped candidate is the heal-potion — the equipped weapon
		 * must never be picked, however the rng roll lands */
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [
				{
					itemId: 1,
					kind: "weapon",
					equipped: true,
					cursed: false,
					weaponKind: "long-sword" as const,
					hitBonus: 1,
					damageBonus: 1,
					quantity: 1,
				} as const,
				{ itemId: 2, kind: "heal-potion" } as const,
			],
		};
		const next = advanceEnemies(state);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "weapon",
				equipped: true,
				cursed: false,
				weaponKind: "long-sword" as const,
				hitBonus: 1,
				damageBonus: 1,
				quantity: 1,
			},
		]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: "heal-potion" } },
		]);
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

	it("an adjacent nymph steals nothing when every held item is equipped", () => {
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [equippedArmor(1)],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([]);
		expect(next.inventory).toEqual([equippedArmor(1)]);
		expect(next.events).toEqual([
			{ type: "item-stolen", payload: { kind: undefined } },
		]);
	});

	it("a fleeing nymph does not affect other enemies acting the same turn", () => {
		const state = {
			...buildCorridorState([nymph(3, 1), zombie(5, 1)]),
			inventory: [EXPOSING_ARMOR, { itemId: 2, kind: "heal-potion" } as const],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			zombie(5, 1),
		]); /* the nymph is gone, the zombie remains */
		expect(next.playerHp).toBeLessThan(
			state.playerHp,
		); /* the zombie still attacked */
		expect(next.inventory).toEqual([EXPOSING_ARMOR]);
	});

	/*
	 * As in original Rogue, an aquator's hit deals no damage: it rusts the
	 * armor instead, every time one of its two attacks lands. Rust only
	 * shows on an armor with a positive defenseBonus, so these tests cannot
	 * use EXPOSING_ARMOR — they hunt for an rng state where the aquator
	 * lands a hit (or misses twice) against ordinary armor.
	 */
	const findAquatorRngState = (state: GameState, wantsHit: boolean): RngState =>
		findRngState(
			(rng) =>
				advanceEnemies({ ...state, rng }).events.some(
					(event) => event.type === "player-hit",
				) === wantsHit,
		);

	it("an adjacent aquator's hit deals no damage but rusts the equipped armor, and it stands its ground", () => {
		const base: GameState = {
			...buildCorridorState([aquator(5, 1)]),
			inventory: [equippedArmor(2)],
		};
		const state = { ...base, rng: findAquatorRngState(base, true) };
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			aquator(5, 1),
		]); /* stays, unlike thief/nymph */
		expect(next.playerHp).toBe(state.playerHp);
		expect(collectHitDamages(next.events).every((damage) => damage === 0)).toBe(
			true,
		);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory) - 1,
		);
		expect(
			next.events.filter((event) => event.type === "armor-rusted"),
		).toEqual([{ type: "armor-rusted", payload: { amount: 1 } }]);
	});

	it("a rustProtected equipped armor never rusts, even when the aquator's hit lands", () => {
		const base: GameState = {
			...buildCorridorState([aquator(5, 1)]),
			inventory: [equippedArmor(2, true)],
		};
		const state = { ...base, rng: findAquatorRngState(base, true) };
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		expect(next.events.some((event) => event.type === "armor-rusted")).toBe(
			false,
		);
	});

	it("no armor equipped at all: a landed aquator hit has nothing to degrade", () => {
		const base = buildCorridorState([aquator(5, 1)]);
		const state = { ...base, rng: findAquatorRngState(base, true) };
		const next = advanceEnemies(state);
		expect(next.inventory).toEqual([]);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events.some((event) => event.type === "armor-rusted")).toBe(
			false,
		);
	});

	it("an aquator whose attacks all miss rusts nothing", () => {
		const base: GameState = {
			...buildCorridorState([aquator(5, 1)]),
			inventory: [equippedArmor(2)],
		};
		const state = { ...base, rng: findAquatorRngState(base, false) };
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		expect(next.events).toEqual([
			{ type: "enemy-attack-missed", payload: { by: "aquator" } },
		]);
	});

	it("only an aquator's hits can rust armor — a zombie never does", () => {
		const base: GameState = {
			...buildCorridorState([zombie(5, 1)]),
			inventory: [equippedArmor(2)],
		};
		const state = { ...base, rng: findAquatorRngState(base, true) };
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		expect(next.events.some((event) => event.type === "armor-rusted")).toBe(
			false,
		);
	});

	it("rust from one aquator carries into the next aquator's turn via the shared accumulator", () => {
		const base: GameState = {
			...buildCorridorState([aquator(5, 1), aquator(3, 1)]),
			inventory: [equippedArmor(5)],
		};
		const rng = findRngState(
			(candidate) =>
				advanceEnemies({ ...base, rng: candidate }).events.filter(
					(event) => event.type === "armor-rusted",
				).length === 2,
		);
		const next = advanceEnemies({ ...base, rng });
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(base.inventory) - 2,
		);
	});

	it("a slowed enemy takes no action at all — no movement, no attack — while frozen", () => {
		const state: GameState = {
			...buildCorridorState([{ ...zombie(5, 1), slowedTurnsRemaining: 2 }]),
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			{ ...zombie(5, 1), slowedTurnsRemaining: 1 },
		]);
		expect(next.playerHp).toBe(state.playerHp); /* no attack landed */
		expect(next.events).toEqual([]);
	});

	it("a slowed enemy resumes normal behavior once the counter reaches 0", () => {
		let current: GameState = buildExposedState([
			{ ...zombie(5, 1), slowedTurnsRemaining: 1 },
		]);
		const startingHp = current.playerHp;
		current =
			advanceEnemies(current); /* countdown: 1 -> 0, still frozen this turn */
		expect(current.enemies).toEqual([
			{ ...zombie(5, 1), slowedTurnsRemaining: 0 },
		]);
		expect(current.playerHp).toBe(startingHp);
		current = advanceEnemies(current); /* now acts normally */
		expect(current.playerHp).toBeLessThan(startingHp);
		expect(current.events.map((event) => event.type)).toEqual(["player-hit"]);
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
			playerMaxHp: PLAYER_MAX_HP,
			playerLevel: 1,
			playerExperience: 0,
			playerStrength: PLAYER_START_STRENGTH,
			playerMaxStrength: PLAYER_START_STRENGTH,
			playerFood: 100,
			confusedTurnsRemaining: 0,
			levitationTurnsRemaining: 0,
			blindTurnsRemaining: 0,
			paralyzedTurnsRemaining: 0,
			detectMonstersTurnsRemaining: 0,
			hallucinatingTurnsRemaining: 0,
			enemies: [zombie(5, 1, false)],
			items: [],
			inventory: [],
			nextItemId: 1,
			identifiedItemKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			deepestFloor: 1,
			turnsOnCurrentFloor: 0,
			quietTurns: 0,
			flytrapHoldDamage: 0,
			floorsWithoutFood: 0,
			wandererDelayTurns: 70,
			wandererRollTurns: 0,
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
		const base = buildExposedState([zombie(5, 1, false)]);
		const rng = findRngState(
			(candidate) =>
				advanceEnemies({ ...base, rng: candidate }).enemies[0]?.awake === true,
		);
		const state = { ...base, rng };
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(5, 1, true)]);
		expect(next.playerHp).toBeLessThan(state.playerHp);
		expect(next.events.map((event) => event.type)).toEqual(["player-hit"]);
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

	/*
	 * A structural property that holds for any rng stream, not just a lucky
	 * seed: STEALTH_RING_WAKE_CHANCE_PERCENT < WAKE_CHANCE_PERCENT, so
	 * `roll.value < stealth/100` implies `roll.value < normal/100` — whenever
	 * an equipped stealth ring's lower threshold wakes a sleeping enemy, the
	 * unringed (higher-threshold) run on the exact same rng stream must also
	 * wake it.
	 */
	it("an equipped stealth ring only ever lowers (never raises) the wake chance, for every seed", () => {
		const stealthRing: HeldItem = {
			itemId: 1,
			kind: "stealth-ring",
			equipped: true,
			cursed: false,
		};
		for (let seed = 0; seed < 200; seed++) {
			const base = {
				...buildArenaGameState(9, 3, 1),
				rng: seedToState(seed),
				enemies: [zombie(5, 1, false)],
			};
			const withRing = advanceEnemies({
				...base,
				inventory: [stealthRing],
			});
			if (withRing.enemies[0]?.awake) {
				const withoutRing = advanceEnemies({ ...base, inventory: [] });
				expect(withoutRing.enemies[0]?.awake).toBe(true);
			}
		}
	});

	it("a confused visible enemy wanders (consuming rng) instead of chasing via A*", () => {
		const confused = { ...zombie(7, 1), confusedTurnsRemaining: 3 };
		const state = buildCorridorState([confused]);
		const next = advanceEnemies(state);
		/* A* pursuit would step to (6,1) deterministically, consuming no rng —
		 * wandering instead consumes rng and may or may not land there. */
		expect(next.rng).not.toEqual(state.rng);
	});

	it("a confused enemy still attacks when adjacent", () => {
		const confused = { ...zombie(5, 1), confusedTurnsRemaining: 3 };
		const state = buildExposedState([confused]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([{ ...confused, confusedTurnsRemaining: 2 }]);
		expect(next.playerHp).toBeLessThan(state.playerHp);
		expect(next.events.map((event) => event.type)).toEqual(["player-hit"]);
	});

	it("confusedTurnsRemaining ticks down by one per turn and stops at zero", () => {
		const confused = { ...zombie(7, 1), confusedTurnsRemaining: 1 };
		const state = buildCorridorState([confused]);
		const next = advanceEnemies(state);
		expect(next.enemies[0]?.confusedTurnsRemaining).toBe(0);
	});

	it("an unconfused enemy still chases deterministically (confusedTurnsRemaining at 0 is a no-op)", () => {
		const state = buildCorridorState([zombie(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([zombie(6, 1)]);
		expect(next.rng).toEqual(state.rng);
	});

	it("an adjacent vampire's landed hit sometimes drains max HP and HP by 1d3 (original Rogue's 30%)", () => {
		const base = buildExposedState([vampire(5, 1)]);
		const rng = findRngState((candidate) =>
			advanceEnemies({ ...base, rng: candidate }).events.some(
				(event) => event.type === "player-drained",
			),
		);
		const next = advanceEnemies({ ...base, rng });
		const [damage] = collectHitDamages(next.events);
		const drained = next.events.find(
			(event) => event.type === "player-drained",
		);
		const lost =
			drained?.type === "player-drained" ? drained.payload.maxHpLost : 0;
		expect(lost).toBeGreaterThanOrEqual(1);
		expect(lost).toBeLessThanOrEqual(3);
		expect(next.playerMaxHp).toBe(base.playerMaxHp - lost);
		expect(next.playerHp).toBe(base.playerHp - (damage ?? 0) - lost);
		expect(next.enemies).toEqual([vampire(5, 1)]);
	});

	it("a wounded troll or griffin does not heal itself — original Rogue's ISREGEN has no enemy-side effect", () => {
		for (const enemy of [
			enemyOf("troll", 7, 1, true, TEST_ENEMY_HP - 3),
			enemyOf("griffin", 7, 1, true, TEST_ENEMY_HP - 3),
		]) {
			const next = advanceEnemies(buildCorridorState([enemy]));
			expect(next.enemies[0]?.hp).toBe(TEST_ENEMY_HP - 3);
		}
	});

	it("a scorpion's sting that lands may drain a point of strength, the maximum untouched", () => {
		const outcomes = buildSpreadRngStates().map((rng) => {
			const state = { ...buildExposedState([enemyOf("scorpion", 5, 1)]), rng };
			const next = advanceEnemies(state);
			expect(next.playerMaxStrength).toBe(state.playerMaxStrength);
			const lost = state.playerStrength - next.playerStrength;
			expect(
				next.events.some((event) => event.type === "player-strength-drained"),
			).toBe(lost > 0);
			return lost;
		});
		expect(outcomes.every((lost) => lost === 0 || lost === 1)).toBe(true);
		/* the level-1 poison save passes 35% of the time */
		const drained = outcomes.filter((lost) => lost === 1).length;
		expect(drained).toBeGreaterThan(outcomes.length / 3);
		expect(drained).toBeLessThan(outcomes.length);
	});

	it("an awake ice monster chases like any other kind", () => {
		const state = buildCorridorState([iceMonster(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([iceMonster(6, 1)]);
	});

	it("an adjacent ice monster's hit freezes instead of hurting", () => {
		/* exposed armor: every attack lands */
		const state = buildExposedState([iceMonster(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.paralyzedTurnsRemaining).toBeGreaterThanOrEqual(2);
		expect(next.paralyzedTurnsRemaining).toBeLessThanOrEqual(3);
		expect(next.events).toEqual([
			{
				type: "player-frozen",
				payload: { turns: next.paralyzedTurnsRemaining },
			},
		]);
	});

	it("an ice monster's attack ends the quiet even when it misses", () => {
		const state = {
			...buildCorridorState([iceMonster(5, 1)]),
			playerLevel: 1,
			quietTurns: 12,
			/* armor so hard every attack misses */
			inventory: [equippedArmor(200)],
		};
		const next = advanceEnemies(state);
		expect(next.paralyzedTurnsRemaining).toBe(0);
		expect(next.events).toEqual([]);
		expect(next.quietTurns).toBe(0);
	});

	it("frozen long enough, the player freezes to death", () => {
		const state = {
			...buildExposedState([iceMonster(5, 1)]),
			paralyzedTurnsRemaining: 49,
		};
		const next = advanceEnemies(state);
		expect(next.status).toBe("dead");
		expect(next.events).toEqual([
			{ type: "player-died", payload: { by: "hypothermia" } },
		]);
	});

	it("a venus-flytrap never moves — neither chasing nor wandering — while visible but not adjacent", () => {
		const state = buildCorridorState([venusFlytrap(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([venusFlytrap(7, 1)]);
		expect(next.rng).toEqual(state.rng); /* no wander roll either */
	});

	it("an adjacent venus-flytrap still attacks in place", () => {
		const state = buildExposedState([venusFlytrap(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([venusFlytrap(5, 1)]);
		expect(next.playerHp).toBeLessThan(state.playerHp);
	});

	it("a venus-flytrap's hold costs more every turn it lasts", () => {
		/* exposed armor: every bite lands */
		let state = buildExposedState([venusFlytrap(5, 1)]);
		const losses: number[] = [];
		for (let turn = 0; turn < 4; turn++) {
			const next = advanceEnemies(state);
			losses.push(state.playerHp - next.playerHp);
			state = next;
		}
		expect(losses).toEqual([1, 2, 3, 4]);
		expect(state.flytrapHoldDamage).toBe(4);
	});

	it("the hold starts over once no awake flytrap is adjacent", () => {
		const held = {
			...buildExposedState([venusFlytrap(5, 1)]),
			flytrapHoldDamage: 6,
		};
		/* the flytrap was killed: nothing left on the floor */
		expect(advanceEnemies({ ...held, enemies: [] }).flytrapHoldDamage).toBe(0);
		/* the player was carried away from it */
		expect(
			advanceEnemies({ ...held, enemies: [venusFlytrap(1, 1)] })
				.flytrapHoldDamage,
		).toBe(0);
		/* still held: it keeps growing from where it was */
		expect(advanceEnemies(held).flytrapHoldDamage).toBe(7);
	});

	/*
	 * A medusa's gaze is a MEDUSA_GAZE_CHANCE_PERCENT chance, rolled once per
	 * turn while visible and not adjacent (see balance.ts) — seed 1's first
	 * roll succeeds, seed 678's fails (same two seeds the wake-roll tests
	 * above already rely on for the same reason).
	 */
	it("a visible, non-adjacent medusa may gaze and confuse the player, without moving", () => {
		const state = buildCorridorState([medusa(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([medusa(7, 1)]); /* stays put either way */
		expect(next.confusedTurnsRemaining).toBe(MEDUSA_GAZE_CONFUSE_DURATION);
		expect(next.events).toEqual([
			{
				type: "player-gazed",
				payload: { turns: MEDUSA_GAZE_CONFUSE_DURATION },
			},
		]);
	});

	it("a medusa's failed gaze roll still leaves it standing still, doing nothing", () => {
		const state = {
			...buildArenaGameState(9, 3, 678),
			enemies: [medusa(7, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([medusa(7, 1)]);
		expect(next.confusedTurnsRemaining).toBe(0);
		expect(next.events).toEqual([]);
	});

	it("an adjacent medusa attacks instead of gazing", () => {
		const state = buildExposedState([medusa(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.confusedTurnsRemaining).toBe(0);
		/* 3d4/3d4/2d5 — three attacks in one logged hit, nothing else */
		expect(next.events.map((event) => event.type)).toEqual(["player-hit"]);
	});

	it("an adjacent wraith's landed hit sometimes takes a level and 1d10 max HP (original Rogue's 15%)", () => {
		const base = {
			...buildExposedState([wraith(5, 1)]),
			playerLevel: 3,
			playerExperience: 25,
		};
		const rng = findRngState((candidate) =>
			advanceEnemies({ ...base, rng: candidate }).events.some(
				(event) => event.type === "player-level-drained",
			),
		);
		const next = advanceEnemies({ ...base, rng });
		expect(next.playerLevel).toBe(2);
		/* one past the threshold of the level just lost (LEVEL_EXPERIENCE_THRESHOLDS[1] = 20) */
		expect(next.playerExperience).toBe(21);
		expect(next.playerMaxHp).toBeLessThan(base.playerMaxHp);
	});
});
