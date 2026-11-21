import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy } from "../state.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 2,
	maxHp: 2,
	awake: true,
	speed: "normal" as const,
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});

describe("applyUseItem dispatch", () => {
	it("using an item spends a turn: adjacent enemies still get to act", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "heal-potion" as const },
				/* an armor class this bad makes the zombie's attack land for sure */
				{
					itemId: 2,
					kind: "armor" as const,
					equipped: true,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: -20,
					rustProtected: false,
				},
			],
			enemies: [zombie(5, 1)] /* adjacent to the player */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.playerHp).toBeLessThan(state.playerHp);
		expect(next.events.some((event) => event.type === "player-hit")).toBe(true);
	});

	it("drinking a potion identifies only that kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "heal-potion" as const },
				{ itemId: 2, kind: "poison" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.identifiedItemKinds).toEqual(["heal-potion"]);
	});

	it("putting a ring on or off leaves its kind unknown, as original Rogue's ring_on()", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "stealth-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const worn = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(worn.inventory[0]).toMatchObject({ equipped: true });
		expect(worn.identifiedItemKinds).toEqual([]);
		const removed = advanceTurn(worn, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(removed.identifiedItemKinds).toEqual([]);
	});

	it("zapping a magic missile identifies it; with no direction it is not zapped and stays unidentified", () => {
		const held = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "magic-missile-wand" as const, charges: 5 },
			],
		};
		const noTarget = advanceTurn(held, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(noTarget.identifiedItemKinds).toEqual([]);
		const zapped = advanceTurn(
			{ ...held, enemies: [zombie(6, 1)] },
			{ type: "use-item", payload: { itemId: 1, direction: "east" } },
		);
		expect(zapped.identifiedItemKinds).toEqual(["magic-missile-wand"]);
	});

	it("zapping a slow wand slows its target but leaves the wand unknown", () => {
		const zapped = advanceTurn(
			{
				...buildArenaGameState(9, 3, 1),
				enemies: [zombie(6, 1)],
				inventory: [{ itemId: 1, kind: "slow-wand" as const, charges: 5 }],
			},
			{ type: "use-item", payload: { itemId: 1, direction: "east" } },
		);
		expect(zapped.enemies[0]?.speed).not.toBe("normal");
		expect(zapped.identifiedItemKinds).toEqual([]);
	});

	it("reading a scroll identifies its kind — in original Rogue scrolls are unknown until read", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "mapping-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.identifiedItemKinds).toEqual(["mapping-scroll"]);
	});

	it("using an itemId with nothing held under it is a no-op (same reference, no turn spent)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [zombie(5, 1)] /* adjacent — would hit if enemies acted */,
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
