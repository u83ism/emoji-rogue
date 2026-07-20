import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import {
	MAGIC_MISSILE_WAND_DAMAGE,
	SLOW_WAND_DURATION,
	WAND_STRIKE_DAMAGE,
	ZOMBIE_MAX_HP,
} from "../balance.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy } from "../state.js";
import { applyUseSleepWand } from "./wands.js";

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: ZOMBIE_MAX_HP,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

describe("items/wands", () => {
	it("using a held wand strikes the nearest visible (non-adjacent) enemy", () => {
		/* WAND_STRIKE_DAMAGE exceeds ZOMBIE_MAX_HP, so a single hit kills it */
		const target = zombie(7, 1); /* 3 tiles east, well within view radius */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "striking-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player); /* the player does not move */
		expect(next.enemies).toEqual([]);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: WAND_STRIKE_DAMAGE },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("using a held wand targets whichever visible enemy is closest", () => {
		const near = zombie(6, 1);
		const far = zombie(8, 1);
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [far, near],
			inventory: [{ itemId: 1, kind: "striking-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		/* the near zombie is the one killed; the far one is untouched */
		expect(next.enemies).toEqual([far]);
	});

	it("using a held wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "striking-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("using a held slow wand freezes the nearest visible (non-adjacent) enemy", () => {
		const target = zombie(7, 1); /* 3 tiles east, well within view radius */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "slow-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player); /* the player does not move */
		/* advanceEnemies runs as part of the same turn-consuming action, so the
		 * freezing turn itself already counts as the first tick */
		expect(next.enemies).toEqual([
			{ ...target, slowedTurnsRemaining: SLOW_WAND_DURATION - 1 },
		]);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{
				type: "enemy-slowed",
				payload: { target: "zombie", turns: SLOW_WAND_DURATION },
			},
		]);
	});

	it("using a held slow wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "slow-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("using a held magic missile wand deals MAGIC_MISSILE_WAND_DAMAGE to the nearest visible (non-adjacent) enemy", () => {
		const target = zombie(7, 1); /* 3 tiles east, well within view radius */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "magic-missile-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player); /* the player does not move */
		expect(next.enemies).toEqual([]);
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{
				type: "wand-struck",
				payload: { target: "zombie", damage: MAGIC_MISSILE_WAND_DAMAGE },
			},
			{ type: "enemy-defeated", payload: { target: "zombie" } },
		]);
	});

	it("using a held magic missile wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "magic-missile-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("applyUseSleepWand forces the nearest visible enemy back to awake: false and logs enemy-slept", () => {
		/* Calls applyUseSleepWand directly rather than via advanceTurn: the
		 * same turn's advanceEnemies would immediately re-roll a wake chance
		 * for a still-visible enemy, so the final `awake` after a full turn
		 * isn't a reliable assertion (same pitfall the enemy-confused/
		 * enemy-slowed tests avoid by checking events, not final position). */
		const target = zombie(7, 1);
		const state = { ...buildArenaGameState(9, 3, 1), enemies: [target] };
		const next = applyUseSleepWand(state);
		expect(next.enemies).toEqual([{ ...target, awake: false }]);
		expect(next.events).toEqual([
			{ type: "enemy-slept", payload: { target: "zombie" } },
		]);
	});

	it("using a held sleep wand consumes it and logs enemy-slept", () => {
		const target = zombie(7, 1);
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "sleep-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.player).toEqual(state.player);
		expect(next.inventory).toEqual([]);
		expect(
			next.events.some(
				(event) =>
					event.type === "enemy-slept" && event.payload.target === "zombie",
			),
		).toBe(true);
	});

	it("using a held sleep wand with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "sleep-wand" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
