import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { PLAYER_MAX_HP } from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import { applyToggleRingEquip, hasEquippedRing } from "./rings.js";

describe("items/rings", () => {
	it("equipping a held regeneration ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "regeneration-ring")).toBe(true);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "regeneration-ring",
				equipped: true,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "regeneration-ring" } },
		]);
	});

	it("using an already-equipped ring unequips it", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "regeneration-ring")).toBe(false);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "regeneration-ring",
				equipped: false,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "item-unequipped", payload: { kind: "regeneration-ring" } },
		]);
	});

	it("equipping a held sustenance ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "sustenance-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "sustenance-ring")).toBe(true);
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "sustenance-ring",
				equipped: true,
				cursed: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "sustenance-ring" } },
		]);
	});

	it("equipping a ring unequips whichever other ring (any kind) was equipped before — only one ring slot total", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
				{
					itemId: 2,
					kind: "sustenance-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 2 },
		});
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "regeneration-ring",
				equipped: false,
				cursed: false,
			},
			{
				itemId: 2,
				kind: "sustenance-ring",
				equipped: true,
				cursed: false,
			},
		]);
	});

	it("equipping a held stealth ring flips its equipped flag and logs ring-equipped", () => {
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
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "stealth-ring")).toBe(true);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "stealth-ring" } },
		]);
	});

	it("equipping a held awareness ring flips its equipped flag and logs ring-equipped", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "awareness-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(hasEquippedRing(next.inventory, "awareness-ring")).toBe(true);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "awareness-ring" } },
		]);
	});

	it("equipping a ring of aggravate monster wakes every sleeping enemy on the floor at once", () => {
		const asleepA = {
			x: 6,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const asleepB = {
			x: 7,
			y: 1,
			kind: "bat" as const,
			hp: 1,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [asleepA, asleepB],
			inventory: [
				{
					itemId: 1,
					kind: "aggravate-monster-ring" as const,
					equipped: false,
					cursed: false,
				},
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.enemies.every((enemy) => enemy.awake)).toBe(true);
		expect(next.events).toEqual([
			{ type: "ring-equipped", payload: { kind: "aggravate-monster-ring" } },
		]);
	});

	it("unequipping a ring of aggravate monster does not re-wake anything (one-time effect on equip only)", () => {
		/* Calls applyToggleRingEquip directly — advanceTurn's use-item action
		 * also runs a full enemy turn (advanceEnemies), which independently
		 * rolls wake chances and would make this assertion flaky. */
		const asleep = {
			x: 6,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			awake: false,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const item = {
			itemId: 1,
			kind: "aggravate-monster-ring" as const,
			equipped: true,
			cursed: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [asleep],
			inventory: [item],
		};
		const next = applyToggleRingEquip(state, item);
		expect(next.enemies).toEqual([asleep]);
		expect(next.events).toEqual([
			{ type: "item-unequipped", payload: { kind: "aggravate-monster-ring" } },
		]);
	});

	it("a ring of regeneration heals HP over time via waiting turns while equipped (wired into every turn-consuming action)", () => {
		const state = {
			...buildArenaGameState(
				9,
				3,
				1,
			) /* this seed's first regen roll succeeds */,
			inventory: [
				{
					itemId: 1,
					kind: "regeneration-ring" as const,
					equipped: true,
					cursed: false,
				},
			],
			playerHp: PLAYER_MAX_HP - 3,
		};
		const next = advanceTurn(state, { type: "wait" });
		expect(next.playerHp).toBe(state.playerHp + 1);
		expect(
			next.events.some((event) => event.type === "player-regenerated"),
		).toBe(true);
	});
});
