import { describe, expect, it } from "vitest";
import { seedToState } from "../rng.js";
import {
	AQUATOR_MAX_HP,
	BAT_MAX_HP,
	GRIFFIN_MAX_HP,
	GRIFFIN_REGEN_AMOUNT,
	ICKY_THING_MAX_HP,
	MEDUSA_GAZE_CONFUSE_DURATION,
	MEDUSA_MAX_HP,
	MIN_DAMAGE_TAKEN,
	NYMPH_MAX_HP,
	PLAYER_ATTACK_DAMAGE,
	PLAYER_MAX_HP,
	THIEF_MAX_HP,
	TROLL_MAX_HP,
	TROLL_REGEN_AMOUNT,
	VAMPIRE_ATTACK_DAMAGE,
	VAMPIRE_MAX_HP,
	VENUS_FLYTRAP_ATTACK_DAMAGE,
	VENUS_FLYTRAP_MAX_HP,
	WRAITH_ATTACK_DAMAGE,
	WRAITH_DRAIN_AMOUNT,
	WRAITH_MAX_HP,
	ZOMBIE_MAX_HP,
} from "./balance.js";
import { advanceEnemies } from "./enemies.js";
import { buildArenaGameState } from "./initialState.js";
import { calculatePlayerDefense } from "./items/equipment.js";
import type { Enemy, GameState, HeldItem } from "./state.js";

/** An equipped armor HeldItem with the given defenseBonus — the new stand-in for the old playerDefense field. */
const equippedArmor = (
	defenseBonus: number,
	rustProtected = false,
): HeldItem => ({
	itemId: 1,
	kind: "armor",
	equipped: true,
	cursed: false,
	defenseBonus,
	rustProtected,
});

const zombie = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const bat = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "bat",
	hp: BAT_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const thief = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "thief",
	hp: THIEF_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const nymph = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "nymph",
	hp: NYMPH_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const aquator = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "aquator",
	hp: AQUATOR_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const vampire = (x: number, y: number, hp = VAMPIRE_MAX_HP): Enemy => ({
	x,
	y,
	kind: "vampire",
	hp,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const griffin = (x: number, y: number, hp = GRIFFIN_MAX_HP): Enemy => ({
	x,
	y,
	kind: "griffin",
	hp,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const troll = (x: number, y: number, hp = TROLL_MAX_HP): Enemy => ({
	x,
	y,
	kind: "troll",
	hp,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const ickyThing = (x: number, y: number, awake = true): Enemy => ({
	x,
	y,
	kind: "icky-thing",
	hp: ICKY_THING_MAX_HP,
	awake,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const venusFlytrap = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "venus-flytrap",
	hp: VENUS_FLYTRAP_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const medusa = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "medusa",
	hp: MEDUSA_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

const wraith = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "wraith",
	hp: WRAITH_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
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
			playerMaxHp: PLAYER_MAX_HP,
			playerLevel: 1,
			playerExperience: 0,
			playerPower: PLAYER_ATTACK_DAMAGE,
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
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			turnsOnCurrentFloor: 0,
			stairs: { x: 2, y: 1, direction: "down" },
			amulet: undefined,
			hasAmulet: false,
			hasAttacked: false,
			hasEaten: false,
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
		/* seed 2's two to-hit+damage rolls both land with damage 1 — see combat dice-ification, milestone 105 */
		const state = { ...buildCorridorState([bat(5, 1)]), rng: seedToState(2) };
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

	it("the equipped armor's defenseBonus reduces incoming damage", () => {
		const state = {
			...buildCorridorState([zombie(5, 1)]),
			inventory: [equippedArmor(1)],
			playerHp: 5,
		};
		const next = advanceEnemies(state);
		/* zombie deals 1; defense would reduce it to 0, but the floor wins */
		expect(next.playerHp).toBe(5 - MIN_DAMAGE_TAKEN);
	});

	it("however high the equipped armor's defenseBonus climbs, damage never drops below MIN_DAMAGE_TAKEN", () => {
		const state = {
			...buildCorridorState([zombie(5, 1)]),
			inventory: [equippedArmor(100)],
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

	it("a failed to-hit roll deals no damage and logs enemy-attack-missed instead of player-hit", () => {
		/* seed 1541's to-hit roll against the player misses outright */
		const state = {
			...buildArenaGameState(9, 3, 1541),
			enemies: [zombie(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events).toEqual([
			{ type: "enemy-attack-missed", payload: { by: "zombie" } },
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
					kind: "sword",
					equipped: false,
					cursed: false,
					attackBonus: 1,
				} as const,
			],
		};
		const next = advanceEnemies(state);
		expect(next.inventory.length).toBe(1); /* one slot consumed */
		const stolenEvent = next.events.at(-1);
		if (stolenEvent === undefined || stolenEvent.type !== "item-stolen") {
			throw new Error("unreachable: expected an item-stolen event");
		}
		expect(["heal-potion", "sword"]).toContain(stolenEvent.payload.kind);
		expect(
			next.inventory.some((item) => item.kind === stolenEvent.payload.kind),
		).toBe(false);
	});

	it("an adjacent nymph never steals an equipped item, even alongside unequipped ones", () => {
		/* the only unequipped candidate is the heal-potion — the equipped sword
		 * must never be picked, however the rng roll lands */
		const state = {
			...buildCorridorState([nymph(5, 1)]),
			inventory: [
				{
					itemId: 1,
					kind: "sword",
					equipped: true,
					cursed: false,
					attackBonus: 1,
				} as const,
				{ itemId: 2, kind: "heal-potion" } as const,
			],
		};
		const next = advanceEnemies(state);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sword",
				equipped: true,
				cursed: false,
				attackBonus: 1,
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
		/* seed 2: the zombie's to-hit+damage roll lands with damage 1 — see combat dice-ification, milestone 105 */
		const state = {
			...buildCorridorState([nymph(3, 1), zombie(5, 1)]),
			inventory: [{ itemId: 1, kind: "heal-potion" } as const],
			rng: seedToState(2),
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
	 * AQUATOR_RUST_CHANCE_PERCENT chance (see balance.ts) — seed 2's to-hit
	 * roll lands and its rust roll succeeds (see combat dice-ification,
	 * milestone 105), seed 1000's rust roll fails.
	 */
	it("an adjacent aquator deals damage, stands its ground, and may rust the equipped armor", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 2),
			inventory: [equippedArmor(2)],
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			aquator(5, 1),
		]); /* stays, unlike thief/nymph */
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory) - 1,
		);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
			{ type: "armor-rusted", payload: { amount: 1 } },
		]);
	});

	it("a rustProtected equipped armor skips the rust roll entirely, even on seed 1 which always rusts unprotected armor", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			inventory: [equippedArmor(2, true)],
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		/* the to-hit+damage rolls still consume rng, only the rust roll itself is skipped — see combat dice-ification, milestone 105 */
		expect(next.rng).not.toEqual(state.rng);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
		]);
	});

	it("no armor equipped at all skips the rust roll entirely — nothing to degrade", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(next.inventory).toEqual([]);
		/* the to-hit+damage rolls still consume rng, only the rust roll itself is skipped — see combat dice-ification, milestone 105 */
		expect(next.rng).not.toEqual(state.rng);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
		]);
	});

	it("an aquator hit that fails its rust roll only deals damage", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1000),
			inventory: [equippedArmor(2)],
			enemies: [aquator(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "aquator", damage: 1 } },
		]);
	});

	it("only an aquator's hits can rust armor — a zombie never does", () => {
		const state: GameState = {
			...buildArenaGameState(9, 3, 1),
			inventory: [equippedArmor(2)],
			enemies: [zombie(5, 1)],
		};
		const next = advanceEnemies(state);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			calculatePlayerDefense(state.inventory),
		);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
	});

	it("rust from one aquator carries into the next aquator's turn via the shared accumulator", () => {
		/* at seed 4, exactly one of these two aquators' hits also rusts — see combat dice-ification, milestone 105 */
		const state: GameState = {
			...buildArenaGameState(9, 3, 4),
			inventory: [equippedArmor(5)],
			enemies: [aquator(5, 1), aquator(3, 1)],
		};
		const next = advanceEnemies(state);
		const rustedEvents = next.events.filter(
			(event) => event.type === "armor-rusted",
		);
		expect(rustedEvents.length).toBe(1);
		expect(calculatePlayerDefense(next.inventory)).toBe(
			4,
		); /* 5 - 1, from the one successful roll */
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
		let current: GameState = buildCorridorState([
			{ ...zombie(5, 1), slowedTurnsRemaining: 1 },
		]);
		current =
			advanceEnemies(current); /* countdown: 1 -> 0, still frozen this turn */
		expect(current.enemies).toEqual([
			{ ...zombie(5, 1), slowedTurnsRemaining: 0 },
		]);
		current = advanceEnemies(current); /* now acts normally */
		expect(current.playerHp).toBe(9);
		expect(current.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
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
			playerPower: PLAYER_ATTACK_DAMAGE,
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
			identifiedPotionKinds: [],
			goldPiles: [],
			goldCollected: 0,
			traps: [],
			floor: 1,
			turnsOnCurrentFloor: 0,
			stairs: { x: 2, y: 1, direction: "down" },
			amulet: undefined,
			hasAmulet: false,
			hasAttacked: false,
			hasEaten: false,
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
		/* seed 2: the wake roll succeeds and the following to-hit+damage roll lands with damage 1 — see combat dice-ification, milestone 105 */
		const state = {
			...buildCorridorState([zombie(5, 1, false)]),
			rng: seedToState(2),
		};
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
		const state = buildCorridorState([confused]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([{ ...confused, confusedTurnsRemaining: 2 }]);
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "zombie", damage: 1 } },
		]);
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

	it("an adjacent vampire heals itself off its own landed hit and logs vampire-healed", () => {
		const state = buildCorridorState([vampire(5, 1, VAMPIRE_MAX_HP - 2)]);
		const next = advanceEnemies(state);
		const healedAmount = Math.floor(VAMPIRE_ATTACK_DAMAGE * 0.5);
		expect(next.enemies).toEqual([
			vampire(5, 1, VAMPIRE_MAX_HP - 2 + healedAmount),
		]);
		expect(next.events).toEqual([
			{
				type: "player-hit",
				payload: { by: "vampire", damage: VAMPIRE_ATTACK_DAMAGE },
			},
			{ type: "vampire-healed", payload: { amount: healedAmount } },
		]);
	});

	it("a vampire already at max HP does not overheal and logs no vampire-healed event", () => {
		const state = buildCorridorState([vampire(5, 1, VAMPIRE_MAX_HP)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([vampire(5, 1, VAMPIRE_MAX_HP)]);
		expect(next.events.some((event) => event.type === "vampire-healed")).toBe(
			false,
		);
	});

	it("a non-vampire adjacent enemy never heals off its own hit", () => {
		const state = buildCorridorState([zombie(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.events.some((event) => event.type === "vampire-healed")).toBe(
			false,
		);
	});

	it("a non-adjacent troll regenerates HP every turn even without landing a hit", () => {
		const state = buildCorridorState([troll(7, 1, TROLL_MAX_HP - 3)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([
			troll(6, 1, TROLL_MAX_HP - 3 + TROLL_REGEN_AMOUNT),
		]);
		expect(next.events).toEqual([
			{
				type: "enemy-regenerated",
				payload: { target: "troll", amount: TROLL_REGEN_AMOUNT },
			},
		]);
	});

	it("regeneration caps at maxHp and logs no event once already full", () => {
		const state = buildCorridorState([troll(7, 1, TROLL_MAX_HP)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([troll(6, 1, TROLL_MAX_HP)]);
		expect(
			next.events.some((event) => event.type === "enemy-regenerated"),
		).toBe(false);
	});

	it("a griffin still only regenerates once per turn despite acting twice (fast)", () => {
		const state = buildCorridorState([griffin(7, 1, GRIFFIN_MAX_HP - 3)]);
		const next = advanceEnemies(state);
		const regenEvents = next.events.filter(
			(event) => event.type === "enemy-regenerated",
		);
		expect(regenEvents.length).toBe(1);
		expect(next.enemies[0]?.hp).toBe(GRIFFIN_MAX_HP - 3 + GRIFFIN_REGEN_AMOUNT);
	});

	it("a sleeping icky-thing does not wake merely from being seen, consuming no rng", () => {
		/* seed 1 would wake a sighted zombie (see above) — icky-thing must not */
		const state = buildCorridorState([ickyThing(7, 1, false)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([ickyThing(7, 1, false)]);
		expect(next.rng).toEqual(state.rng);
	});

	it("a sleeping icky-thing adjacent to the player can still wake", () => {
		const state = buildCorridorState([ickyThing(5, 1, false)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([ickyThing(5, 1, true)]);
	});

	it("an awake icky-thing never chases even when visible, only wanders", () => {
		/* a zombie at the same spot would deterministically step to (6,1)
		 * without touching rng — icky-thing wanders instead, consuming rng */
		const state = buildCorridorState([ickyThing(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.rng).not.toEqual(state.rng);
	});

	it("an icky-thing still attacks when adjacent, despite being blind", () => {
		const state = buildCorridorState([ickyThing(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.playerHp).toBe(state.playerHp - 1);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "icky-thing", damage: 1 } },
		]);
	});

	it("a venus-flytrap never moves — neither chasing nor wandering — while visible but not adjacent", () => {
		const state = buildCorridorState([venusFlytrap(7, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([venusFlytrap(7, 1)]);
		expect(next.rng).toEqual(state.rng); /* no wander roll either */
	});

	it("an adjacent venus-flytrap still attacks in place", () => {
		const state = buildCorridorState([venusFlytrap(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.enemies).toEqual([venusFlytrap(5, 1)]);
		expect(next.playerHp).toBe(state.playerHp - VENUS_FLYTRAP_ATTACK_DAMAGE);
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
		const state = buildCorridorState([medusa(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.confusedTurnsRemaining).toBe(0);
		expect(next.events).toEqual([
			{ type: "player-hit", payload: { by: "medusa", damage: 2 } },
		]);
	});

	it("an adjacent wraith permanently drains playerMaxHp on a landed hit", () => {
		const state = buildCorridorState([wraith(5, 1)]);
		const next = advanceEnemies(state);
		expect(next.playerMaxHp).toBe(state.playerMaxHp - WRAITH_DRAIN_AMOUNT);
		expect(next.playerHp).toBe(state.playerHp - WRAITH_ATTACK_DAMAGE);
		expect(next.events).toEqual([
			{
				type: "player-hit",
				payload: { by: "wraith", damage: WRAITH_ATTACK_DAMAGE },
			},
			{ type: "player-drained", payload: { amount: WRAITH_DRAIN_AMOUNT } },
		]);
	});

	it("wraith drain never lowers playerMaxHp below 1, and logs no player-drained once there", () => {
		const state = { ...buildCorridorState([wraith(5, 1)]), playerMaxHp: 1 };
		const next = advanceEnemies(state);
		expect(next.playerMaxHp).toBe(1);
		expect(next.events.some((event) => event.type === "player-drained")).toBe(
			false,
		);
	});
});
