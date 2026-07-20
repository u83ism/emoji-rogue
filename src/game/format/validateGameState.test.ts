import { describe, expect, it } from "vitest";
import { buildDungeonGameState } from "../initialState.js";
import { validateGameState } from "./validateGameState.js";

const buildValidState = (): Record<string, unknown> => {
	const state = buildDungeonGameState(20, 12, 42);
	const serialized: unknown = JSON.parse(JSON.stringify(state));
	if (typeof serialized !== "object" || serialized === null) {
		throw new Error("unreachable: a serialized GameState is an object");
	}
	return { ...serialized };
};

const expectRejected = (tampered: unknown, field: string): void => {
	const result = validateGameState(tampered);
	expect(result.ok).toBe(false);
	if (!result.ok) {
		expect(result.error).toBe(field);
	}
};

describe("validateGameState", () => {
	it("accepts a serialized real game state and rebuilds it exactly", () => {
		const state = buildDungeonGameState(20, 12, 42);
		const result = validateGameState(JSON.parse(JSON.stringify(state)));
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(state);
		}
	});

	it("drops unknown extra fields on rebuild", () => {
		const result = validateGameState({
			...buildValidState(),
			cheatFlag: true,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect("cheatFlag" in result.value).toBe(false);
		}
	});

	it("rejects non-record roots", () => {
		expectRejected(null, "root");
		expectRejected("[]", "root");
		expectRejected(42, "root");
	});

	it("rejects broken dimensions and grids", () => {
		expectRejected({ ...buildValidState(), width: "20" }, "width");
		expectRejected({ ...buildValidState(), height: 0 }, "height");
		expectRejected({ ...buildValidState(), terrain: [] }, "terrain");

		const shortColumn = buildValidState();
		const terrain = shortColumn.terrain;
		if (!Array.isArray(terrain)) {
			throw new Error("unreachable: terrain is an array here");
		}
		terrain[3] = terrain[3].slice(1); /* one column too short */
		expectRejected(shortColumn, "terrain");

		expectRejected({ ...buildValidState(), explored: [[true]] }, "explored");
	});

	it("rejects actors off the floor or out of bounds", () => {
		expectRejected(
			{ ...buildValidState(), player: { x: 0, y: 0 } } /* perimeter wall */,
			"player",
		);
		expectRejected({ ...buildValidState(), player: { x: -1, y: 2 } }, "player");
		expectRejected(
			{
				...buildValidState(),
				enemies: [{ x: 0, y: 0, kind: "zombie", hp: 2, awake: true }],
			},
			"enemies",
		);
	});

	it("accepts a bat as a valid enemy kind", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		const result = validateGameState({
			...valid,
			enemies: [{ ...enemies[0], kind: "bat", hp: 1 }],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts a thief as a valid enemy kind", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		const result = validateGameState({
			...valid,
			enemies: [{ ...enemies[0], kind: "thief", hp: 2 }],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts a nymph as a valid enemy kind", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		const result = validateGameState({
			...valid,
			enemies: [{ ...enemies[0], kind: "nymph", hp: 1 }],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts an aquator as a valid enemy kind", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		const result = validateGameState({
			...valid,
			enemies: [{ ...enemies[0], kind: "aquator", hp: 3 }],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects broken combat fields", () => {
		expectRejected({ ...buildValidState(), playerHp: 0 }, "playerHp");
		expectRejected({ ...buildValidState(), playerHp: 9999 }, "playerHp");
		expectRejected({ ...buildValidState(), playerMaxHp: 0 }, "playerMaxHp");
		expectRejected({ ...buildValidState(), playerMaxHp: "10" }, "playerMaxHp");
		expectRejected({ ...buildValidState(), playerLevel: 0 }, "playerLevel");
		expectRejected({ ...buildValidState(), playerLevel: 1.5 }, "playerLevel");
		expectRejected(
			{ ...buildValidState(), playerExperience: -1 },
			"playerExperience",
		);
		expectRejected(
			{ ...buildValidState(), playerExperience: "0" },
			"playerExperience",
		);
		expectRejected({ ...buildValidState(), playerPower: 0 }, "playerPower");
		expectRejected({ ...buildValidState(), playerPower: "1" }, "playerPower");
		expectRejected({ ...buildValidState(), playerFood: -1 }, "playerFood");
		expectRejected({ ...buildValidState(), playerFood: 101 }, "playerFood");
		expectRejected({ ...buildValidState(), playerFood: "1" }, "playerFood");

		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], kind: "griffin" }] },
			"enemies",
		);
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], hp: 0 }] },
			"enemies",
		);
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], awake: "true" }] },
			"enemies",
		);
		expectRejected(
			{ ...valid, enemies: [{ ...enemies[0], confusedTurnsRemaining: -1 }] },
			"enemies",
		);
		expectRejected(
			{ ...buildValidState(), events: [{ type: "player-hit", payload: {} }] },
			"events",
		);
		expectRejected(
			{ ...buildValidState(), events: [{ type: "unknown", payload: {} }] },
			"events",
		);
	});

	it("rejects broken items", () => {
		expectRejected(
			{
				...buildValidState(),
				items: [{ x: 0, y: 0, kind: "heal-potion" }] /* perimeter wall */,
			},
			"items",
		);
		expectRejected(
			{ ...buildValidState(), items: [{ x: 2, y: 2, kind: "bow" }] },
			"items",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "player-healed", payload: { by: "heal-potion", amount: -1 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "item-picked-up", payload: { kind: "bow" } }],
			},
			"events",
		);
	});

	it("accepts a well-formed equipment item identity and rejects a broken or missing one", () => {
		const { x, y } = buildDungeonGameState(20, 12, 42).stairs;
		const floorSpot = { x, y };

		const accepted = validateGameState({
			...buildValidState(),
			items: [
				{
					...floorSpot,
					kind: "sword",
					identity: { itemId: 7, cursed: true, attackBonus: 3 },
				},
			],
		});
		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.items).toEqual([
				{
					...floorSpot,
					kind: "sword",
					identity: { itemId: 7, cursed: true, attackBonus: 3 },
				},
			]);
		}

		/* identity is rolled at floor generation, so every equipment-kind item
		 * always has one — a fresh spawn with none is invalid */
		expectRejected(
			{ ...buildValidState(), items: [{ ...floorSpot, kind: "armor" }] },
			"items",
		);

		expectRejected(
			{
				...buildValidState(),
				items: [
					{
						...floorSpot,
						kind: "sword",
						identity: { itemId: 7, cursed: true },
					},
				] /* missing attackBonus */,
			},
			"items",
		);

		/* a non-equipment kind has no identity concept at all — a bogus one is
		 * simply dropped on rebuild, same as any other unknown extra field. */
		const ignoredOnConsumable = validateGameState({
			...buildValidState(),
			items: [
				{
					...floorSpot,
					kind: "heal-potion",
					identity: { itemId: 7, cursed: true },
				},
			],
		});
		expect(ignoredOnConsumable.ok).toBe(true);
		if (ignoredOnConsumable.ok) {
			expect(ignoredOnConsumable.value.items).toEqual([
				{ ...floorSpot, kind: "heal-potion" },
			]);
		}
	});

	it("accepts a well-formed game-won event", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "game-won", payload: {} }],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts a well-formed weapon-equipped event and rejects a broken one", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1 } },
			],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "weapon-equipped", payload: { kind: "bow", bonus: 1 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "weapon-equipped", payload: { kind: "sword", bonus: 1.5 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed weapon-enchanted event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "weapon-enchanted", payload: { bonus: 1 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "weapon-enchanted", payload: { bonus: 0 } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "weapon-enchanted", payload: { bonus: -1 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed armor-enchanted event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "armor-enchanted", payload: { bonus: 1 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "armor-enchanted", payload: { bonus: 0 } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "armor-enchanted", payload: { bonus: -1 } }],
			},
			"events",
		);
	});

	it("accepts well-formed player-confused and confusion-faded events and rejects a broken one", () => {
		const confused = validateGameState({
			...buildValidState(),
			events: [{ type: "player-confused", payload: { turns: 10 } }],
		});
		expect(confused.ok).toBe(true);

		const faded = validateGameState({
			...buildValidState(),
			events: [{ type: "confusion-faded", payload: {} }],
		});
		expect(faded.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-confused", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed enemy-slowed event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "enemy-slowed", payload: { target: "zombie", turns: 5 } },
			],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "enemy-slowed", payload: { target: "griffin", turns: 5 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "enemy-slowed", payload: { target: "zombie", turns: 0 } },
				],
			},
			"events",
		);
	});

	it("rejects a non-integer or negative slowedTurnsRemaining on an enemy", () => {
		const valid = buildValidState();
		const enemies = valid.enemies;
		if (!Array.isArray(enemies) || enemies.length === 0) {
			throw new Error("unreachable: the dungeon state spawns enemies");
		}
		expectRejected(
			{
				...valid,
				enemies: [{ ...enemies[0], slowedTurnsRemaining: -1 }],
			},
			"enemies",
		);
	});

	it("accepts well-formed player-levitated and levitation-faded events and rejects a broken one", () => {
		const levitated = validateGameState({
			...buildValidState(),
			events: [{ type: "player-levitated", payload: { turns: 15 } }],
		});
		expect(levitated.ok).toBe(true);

		const faded = validateGameState({
			...buildValidState(),
			events: [{ type: "levitation-faded", payload: {} }],
		});
		expect(faded.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-levitated", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed armor-protected event", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "armor-protected", payload: {} }],
		});
		expect(result.ok).toBe(true);
	});

	it("rejects a non-integer or non-positive nextItemId", () => {
		expectRejected({ ...buildValidState(), nextItemId: "1" }, "nextItemId");
		expectRejected({ ...buildValidState(), nextItemId: 0 }, "nextItemId");
	});

	it("rejects a non-boolean hasAttacked or hasEaten", () => {
		expectRejected(
			{ ...buildValidState(), hasAttacked: "true" },
			"hasAttacked",
		);
		expectRejected({ ...buildValidState(), hasEaten: "true" }, "hasEaten");
	});

	it("rejects a non-integer or negative levitationTurnsRemaining", () => {
		expectRejected(
			{ ...buildValidState(), levitationTurnsRemaining: -1 },
			"levitationTurnsRemaining",
		);
		expectRejected(
			{ ...buildValidState(), levitationTurnsRemaining: 1.5 },
			"levitationTurnsRemaining",
		);
	});

	it("rejects a non-integer or negative confusedTurnsRemaining", () => {
		expectRejected(
			{ ...buildValidState(), confusedTurnsRemaining: -1 },
			"confusedTurnsRemaining",
		);
		expectRejected(
			{ ...buildValidState(), confusedTurnsRemaining: 1.5 },
			"confusedTurnsRemaining",
		);
	});

	it("rejects a non-integer or negative blindTurnsRemaining", () => {
		expectRejected(
			{ ...buildValidState(), blindTurnsRemaining: -1 },
			"blindTurnsRemaining",
		);
		expectRejected(
			{ ...buildValidState(), blindTurnsRemaining: 1.5 },
			"blindTurnsRemaining",
		);
	});

	it("rejects a non-integer or negative paralyzedTurnsRemaining", () => {
		expectRejected(
			{ ...buildValidState(), paralyzedTurnsRemaining: -1 },
			"paralyzedTurnsRemaining",
		);
		expectRejected(
			{ ...buildValidState(), paralyzedTurnsRemaining: 1.5 },
			"paralyzedTurnsRemaining",
		);
	});

	it("accepts well-formed player-paralyzed and paralysis-faded events and rejects a broken one", () => {
		const paralyzed = validateGameState({
			...buildValidState(),
			events: [{ type: "player-paralyzed", payload: { turns: 3 } }],
		});
		expect(paralyzed.ok).toBe(true);

		const faded = validateGameState({
			...buildValidState(),
			events: [{ type: "paralysis-faded", payload: {} }],
		});
		expect(faded.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-paralyzed", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("rejects a non-integer or negative detectMonstersTurnsRemaining", () => {
		expectRejected(
			{ ...buildValidState(), detectMonstersTurnsRemaining: -1 },
			"detectMonstersTurnsRemaining",
		);
		expectRejected(
			{ ...buildValidState(), detectMonstersTurnsRemaining: 1.5 },
			"detectMonstersTurnsRemaining",
		);
	});

	it("accepts well-formed player-detected-monsters and detect-monsters-faded events and rejects a broken one", () => {
		const detected = validateGameState({
			...buildValidState(),
			events: [{ type: "player-detected-monsters", payload: { turns: 20 } }],
		});
		expect(detected.ok).toBe(true);

		const faded = validateGameState({
			...buildValidState(),
			events: [{ type: "detect-monsters-faded", payload: {} }],
		});
		expect(faded.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-detected-monsters", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed player-revitalized event and rejects a broken one", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "player-revitalized", payload: { maxHpBonus: 5 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-revitalized", payload: { maxHpBonus: 0 } }],
			},
			"events",
		);
	});

	it("rejects a non-integer or negative turnsOnCurrentFloor", () => {
		expectRejected(
			{ ...buildValidState(), turnsOnCurrentFloor: -1 },
			"turnsOnCurrentFloor",
		);
		expectRejected(
			{ ...buildValidState(), turnsOnCurrentFloor: 1.5 },
			"turnsOnCurrentFloor",
		);
	});

	it("accepts well-formed winds-of-kron-warning and winds-of-kron-eviction events", () => {
		const warning = validateGameState({
			...buildValidState(),
			events: [{ type: "winds-of-kron-warning", payload: {} }],
		});
		expect(warning.ok).toBe(true);

		const eviction = validateGameState({
			...buildValidState(),
			events: [{ type: "winds-of-kron-eviction", payload: {} }],
		});
		expect(eviction.ok).toBe(true);
	});

	it("accepts well-formed player-blinded and blindness-faded events and rejects a broken one", () => {
		const blinded = validateGameState({
			...buildValidState(),
			events: [{ type: "player-blinded", payload: { turns: 20 } }],
		});
		expect(blinded.ok).toBe(true);

		const faded = validateGameState({
			...buildValidState(),
			events: [{ type: "blindness-faded", payload: {} }],
		});
		expect(faded.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-blinded", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed player-leveled-up event and rejects a broken one", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "player-leveled-up", payload: { level: 2 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-leveled-up", payload: { level: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed wand-struck event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "wand-struck", payload: { target: "zombie", damage: 3 } },
			],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "wand-struck", payload: { target: "griffin", damage: 3 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "wand-struck", payload: { target: "zombie", damage: 0 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed enemy-teleported event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "enemy-teleported", payload: { target: "zombie" } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "enemy-teleported", payload: { target: "griffin" } }],
			},
			"events",
		);
	});

	it("accepts well-formed hallucination events and rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			hallucinatingTurnsRemaining: 5,
			events: [
				{ type: "player-hallucinated", payload: { turns: 20 } },
				{ type: "hallucination-faded", payload: {} },
			],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{ ...buildValidState(), hallucinatingTurnsRemaining: -1 },
			"hallucinatingTurnsRemaining",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-hallucinated", payload: { turns: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed enemy-held event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "enemy-held", payload: { target: "zombie", turns: 5 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "enemy-held", payload: { target: "griffin", turns: 5 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed enemy-confused event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "enemy-confused", payload: { target: "zombie", turns: 8 } },
			],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "enemy-confused", payload: { target: "griffin", turns: 8 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed orc-gold-drop event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "orc-gold-drop", payload: { amount: 5 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "orc-gold-drop", payload: { amount: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed armor-rusted event and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "armor-rusted", payload: { amount: 1 } }],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "armor-rusted", payload: { amount: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed armor-equipped event (including a rusted-to-0 bonus) and rejects broken ones", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "armor-equipped", payload: { kind: "armor", bonus: 1 } },
			],
		});
		expect(result.ok).toBe(true);

		const rustedToZero = validateGameState({
			...buildValidState(),
			events: [
				{ type: "armor-equipped", payload: { kind: "armor", bonus: 0 } },
			],
		});
		expect(rustedToZero.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "armor-equipped", payload: { kind: "bow", bonus: 1 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "armor-equipped", payload: { kind: "armor", bonus: -1 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed sneak-attack event and rejects a broken one", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [
				{ type: "sneak-attack", payload: { target: "zombie", damage: 3 } },
			],
		});
		expect(result.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "sneak-attack", payload: { target: "griffin", damage: 3 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "sneak-attack", payload: { target: "zombie", damage: 0 } },
				],
			},
			"events",
		);
	});

	it("accepts a well-formed ring-equipped and player-regenerated event and rejects broken ones", () => {
		const equipped = validateGameState({
			...buildValidState(),
			events: [
				{ type: "ring-equipped", payload: { kind: "regeneration-ring" } },
			],
		});
		expect(equipped.ok).toBe(true);

		const regenerated = validateGameState({
			...buildValidState(),
			events: [{ type: "player-regenerated", payload: { amount: 1 } }],
		});
		expect(regenerated.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "ring-equipped", payload: { kind: "bow" } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-regenerated", payload: { amount: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed sustenance ring-equipped event", () => {
		const result = validateGameState({
			...buildValidState(),
			events: [{ type: "ring-equipped", payload: { kind: "sustenance-ring" } }],
		});
		expect(result.ok).toBe(true);
	});

	it("accepts well-formed item-unequipped/equip-blocked-cursed/curse-revealed/items-decursed events, rejects broken ones", () => {
		const unequipped = validateGameState({
			...buildValidState(),
			events: [{ type: "item-unequipped", payload: { kind: "sword" } }],
		});
		expect(unequipped.ok).toBe(true);

		const blocked = validateGameState({
			...buildValidState(),
			events: [{ type: "equip-blocked-cursed", payload: { kind: "armor" } }],
		});
		expect(blocked.ok).toBe(true);

		const revealed = validateGameState({
			...buildValidState(),
			events: [
				{ type: "curse-revealed", payload: { kind: "regeneration-ring" } },
			],
		});
		expect(revealed.ok).toBe(true);

		const decursed = validateGameState({
			...buildValidState(),
			events: [{ type: "items-decursed", payload: { count: 2 } }],
		});
		expect(decursed.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "item-unequipped", payload: { kind: "bow" } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "items-decursed", payload: { count: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed inventory (including swords, armor and food, each its own slot) and rejects a broken one", () => {
		const inventory = [
			{ itemId: 1, kind: "heal-potion" },
			{ itemId: 2, kind: "heal-potion" },
			{
				itemId: 3,
				kind: "sword",
				equipped: true,
				cursed: false,
				attackBonus: 1,
			},
			{
				itemId: 4,
				kind: "armor",
				equipped: false,
				cursed: true,
				defenseBonus: 1,
				rustProtected: false,
			},
			{ itemId: 5, kind: "food" },
		] as const;
		const accepted = validateGameState({
			...buildValidState(),
			inventory,
		});
		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.inventory).toEqual(inventory);
		}

		expectRejected(
			{ ...buildValidState(), inventory: [{ itemId: 1, kind: "bow" }] },
			"inventory",
		);
		expectRejected(
			{
				...buildValidState(),
				inventory: [{ itemId: 1, kind: "sword", equipped: true }],
			} /* cursed/attackBonus missing */,
			"inventory",
		);
	});

	it("accepts a well-formed hunger-related event set and rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			events: [
				{ type: "player-hungry", payload: {} },
				{ type: "player-starved", payload: { damage: 1 } },
				{ type: "player-ate", payload: { amount: 50 } },
				{ type: "player-died", payload: { by: "hunger" } },
			],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-starved", payload: { damage: 0 } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-ate", payload: { amount: -1 } }],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-died", payload: { by: "starvation" } }],
			},
			"events",
		);
	});

	it("accepts well-formed gold piles and a gold-collected event, rejects broken ones", () => {
		/* the staircase tile is always floor, wherever this dungeon put it */
		const { x, y } = buildDungeonGameState(20, 12, 42).stairs;
		const floorSpot = { x, y };

		const accepted = validateGameState({
			...buildValidState(),
			goldPiles: [{ ...floorSpot, amount: 5 }],
			goldCollected: 10,
			events: [{ type: "gold-collected", payload: { amount: 5 } }],
		});
		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.goldPiles).toEqual([{ ...floorSpot, amount: 5 }]);
			expect(accepted.value.goldCollected).toBe(10);
		}

		expectRejected(
			{
				...buildValidState(),
				goldPiles: [{ x: 0, y: 0, amount: 5 }] /* perimeter wall */,
			},
			"goldPiles",
		);
		expectRejected(
			{ ...buildValidState(), goldPiles: [{ ...floorSpot, amount: 0 }] },
			"goldPiles",
		);
		expectRejected(
			{ ...buildValidState(), goldCollected: -1 },
			"goldCollected",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "gold-collected", payload: { amount: 0 } }],
			},
			"events",
		);
	});

	it("accepts well-formed hidden traps and a trap-triggered event, rejects broken ones", () => {
		const { x, y } = buildDungeonGameState(20, 12, 42).stairs;
		const floorSpot = { x, y };

		const accepted = validateGameState({
			...buildValidState(),
			traps: [{ ...floorSpot, kind: "dart" }],
			events: [
				{ type: "trap-triggered", payload: { kind: "dart", damage: 2 } },
				{ type: "player-died", payload: { by: "trap" } },
			],
		});
		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.traps).toEqual([{ ...floorSpot, kind: "dart" }]);
		}

		expectRejected(
			{ ...buildValidState(), traps: [{ x: 0, y: 0, kind: "dart" }] },
			"traps",
		);
		expectRejected(
			{ ...buildValidState(), traps: [{ ...floorSpot, kind: "pit" }] },
			"traps",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "trap-triggered", payload: { kind: "dart", damage: 0 } },
				],
			},
			"events",
		);

		const trapdoorAccepted = validateGameState({
			...buildValidState(),
			traps: [{ ...floorSpot, kind: "trapdoor" }],
			events: [
				{ type: "trap-triggered", payload: { kind: "trapdoor", damage: 0 } },
			],
		});
		expect(trapdoorAccepted.ok).toBe(true);

		const teleportTrapAccepted = validateGameState({
			...buildValidState(),
			traps: [{ ...floorSpot, kind: "teleport" }],
			events: [
				{ type: "trap-triggered", payload: { kind: "teleport", damage: 0 } },
			],
		});
		expect(teleportTrapAccepted.ok).toBe(true);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "trap-triggered", payload: { kind: "teleport", damage: -1 } },
				],
			},
			"events",
		);

		const bearTrapAccepted = validateGameState({
			...buildValidState(),
			traps: [{ ...floorSpot, kind: "bear" }],
			events: [
				{ type: "trap-triggered", payload: { kind: "bear", damage: 0 } },
			],
		});
		expect(bearTrapAccepted.ok).toBe(true);
		expectRejected(
			{
				...buildValidState(),
				events: [
					{ type: "trap-triggered", payload: { kind: "bear", damage: -1 } },
				],
			},
			"events",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-died", payload: { by: "curse" } }],
			},
			"events",
		);
	});

	it("accepts a poison item kind, identifiedPotionKinds and a player-poisoned event, rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			items: [],
			inventory: [{ itemId: 1, kind: "poison" }],
			identifiedPotionKinds: ["poison"],
			events: [
				{ type: "player-poisoned", payload: { damage: 4 } },
				{ type: "player-died", payload: { by: "poison" } },
			],
		});
		expect(accepted.ok).toBe(true);
		if (accepted.ok) {
			expect(accepted.value.identifiedPotionKinds).toEqual(["poison"]);
		}

		expectRejected(
			{ ...buildValidState(), identifiedPotionKinds: ["dragon"] },
			"identifiedPotionKinds",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-poisoned", payload: { damage: 0 } }],
			},
			"events",
		);
	});

	it("accepts a scroll item kind and a player-teleported event, rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			items: [],
			inventory: [{ itemId: 1, kind: "teleport-scroll" }],
			events: [{ type: "player-teleported", payload: { x: 3, y: 4 } }],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{ ...buildValidState(), items: [{ x: 2, y: 2, kind: "amulet" }] },
			"items",
		);
		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-teleported", payload: { x: -1, y: 4 } }],
			},
			"events",
		);
	});

	it("accepts a mapping item kind and a floor-mapped event", () => {
		const accepted = validateGameState({
			...buildValidState(),
			items: [],
			inventory: [{ itemId: 1, kind: "mapping-scroll" }],
			events: [{ type: "floor-mapped", payload: {} }],
		});
		expect(accepted.ok).toBe(true);
	});

	it("accepts an identify item kind and a potion-identified event, rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			items: [],
			inventory: [{ itemId: 1, kind: "identify-scroll" }],
			events: [{ type: "potion-identified", payload: { kind: "poison" } }],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "potion-identified", payload: { kind: "amulet" } }],
			},
			"events",
		);
	});

	it("accepts a strength item kind and a player-strengthened event, rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			items: [],
			inventory: [{ itemId: 1, kind: "strength" }],
			events: [{ type: "player-strengthened", payload: { bonus: 1 } }],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "player-strengthened", payload: { bonus: 0 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed gold-stolen event (including a zero-amount steal), rejects broken ones", () => {
		const accepted = validateGameState({
			...buildValidState(),
			events: [{ type: "gold-stolen", payload: { amount: 0 } }],
		});
		expect(accepted.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "gold-stolen", payload: { amount: -1 } }],
			},
			"events",
		);
	});

	it("accepts a well-formed item-stolen event (including an empty-inventory steal), rejects a broken one", () => {
		const stolenSomething = validateGameState({
			...buildValidState(),
			events: [{ type: "item-stolen", payload: { kind: "sword" } }],
		});
		expect(stolenSomething.ok).toBe(true);

		const stolenNothing = validateGameState({
			...buildValidState(),
			events: [{ type: "item-stolen", payload: { kind: undefined } }],
		});
		expect(stolenNothing.ok).toBe(true);

		expectRejected(
			{
				...buildValidState(),
				events: [{ type: "item-stolen", payload: { kind: "bow" } }],
			},
			"events",
		);
	});

	it("rejects a broken floor counter or misplaced stairs", () => {
		expectRejected({ ...buildValidState(), floor: 0 }, "floor");
		expectRejected({ ...buildValidState(), floor: 2.5 }, "floor");
		expectRejected(
			{ ...buildValidState(), stairs: { x: 0, y: 0 } } /* perimeter wall */,
			"stairs",
		);
		expectRejected({ ...buildValidState(), stairs: undefined }, "stairs");
	});

	it("rejects broken rng and non-playing status", () => {
		expectRejected({ ...buildValidState(), rng: { s0: 1, s1: 2 } }, "rng");
		expectRejected(
			{ ...buildValidState(), rng: { s0: 1, s1: 2, s2: Number.NaN, c: 1 } },
			"rng",
		);
		expectRejected({ ...buildValidState(), status: "dead" }, "status");
	});
});
