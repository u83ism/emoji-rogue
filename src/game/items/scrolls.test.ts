import { describe, expect, it } from "vitest";
import { advanceTurn } from "../advanceTurn.js";
import { buildArenaGameState, buildDungeonGameState } from "../initialState.js";

describe("items/scrolls", () => {
	it("using a held scroll teleports the player, consumes the scroll, and consumes rng", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "teleport-scroll" as const },
				{ itemId: 2, kind: "teleport-scroll" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "teleport-scroll" }]);
		expect(next.rng).not.toEqual(state.rng);
		expect(next.events).toEqual([
			{
				type: "player-teleported",
				payload: {
					x: next.player.x,
					y: next.player.y,
					source: "teleport-scroll",
				},
			},
		]);
	});

	it("using a held mapping scroll reveals the entire floor as explored", () => {
		const state = buildDungeonGameState(40, 20, 7);
		const withScroll = {
			...state,
			inventory: [{ itemId: 1, kind: "mapping-scroll" as const }],
		};
		const next = advanceTurn(withScroll, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.player).toEqual(
			state.player,
		); /* mapping does not move the player */
		expect(next.events).toEqual([{ type: "floor-mapped", payload: {} }]);
		for (let x = 0; x < next.width; x++) {
			for (let y = 0; y < next.height; y++) {
				expect(next.explored[x]?.[y]).toBe(true);
			}
		}
	});

	it("an identify scroll pointed at a held potion identifies that potion's kind", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{ itemId: 1, kind: "identify-scroll" as const },
				{ itemId: 2, kind: "blindness" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, targetItemId: 2 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "blindness" }]);
		expect(next.identifiedItemKinds).toEqual(["blindness"]);
		expect(next.events).toEqual([
			{ type: "potion-identified", payload: { kind: "blindness" } },
		]);
	});

	it("an identify scroll pointed at a potion already known is still used up", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			identifiedItemKinds: ["blindness"] as const,
			inventory: [
				{ itemId: 1, kind: "identify-scroll" as const },
				{ itemId: 2, kind: "blindness" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, targetItemId: 2 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "blindness" }]);
		expect(next.identifiedItemKinds).toEqual(["blindness"]);
	});

	it("an identify scroll with no potion pointed at is wasted", () => {
		for (const payload of [{ itemId: 1 }, { itemId: 1, targetItemId: 3 }]) {
			const state = {
				...buildArenaGameState(9, 3, 1),
				inventory: [
					{ itemId: 1, kind: "identify-scroll" as const },
					{ itemId: 3, kind: "food" as const },
				],
			};
			const next = advanceTurn(state, {
				type: "use-item",
				payload,
			});
			expect(next.inventory).toEqual([{ itemId: 3, kind: "food" }]);
			expect(next.identifiedItemKinds).toEqual([]);
			expect(next.events).toEqual([
				{ type: "scroll-wasted", payload: { kind: "identify-scroll" } },
			]);
		}
	});

	it("using a held confuse monster scroll sets the nearest visible (non-adjacent) enemy's confusedTurnsRemaining and logs enemy-confused", () => {
		const target = {
			x: 7,
			y: 1,
			kind: "zombie" as const,
			hp: 2,
			maxHp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [target],
			inventory: [{ itemId: 1, kind: "confuse-monster-scroll" as const }],
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
					event.type === "enemy-confused" && event.payload.target === "zombie",
			),
		).toBe(true);
		expect(next.enemies[0]?.confusedTurnsRemaining).toBeGreaterThan(0);
	});

	it("using a held confuse monster scroll with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "confuse-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});

	it("using a held hold monster scroll freezes every visible enemy and logs one enemy-held per target", () => {
		const near = {
			x: 6,
			y: 4,
			kind: "zombie" as const,
			hp: 2,
			maxHp: 2,
			awake: true,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const far = {
			x: 7,
			y: 4,
			kind: "bat" as const,
			hp: 1,
			maxHp: 1,
			awake: true,
			slowedTurnsRemaining: 0,
			confusedTurnsRemaining: 0,
		};
		const state = {
			...buildArenaGameState(9, 9, 1),
			enemies: [near, far],
			inventory: [{ itemId: 1, kind: "hold-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.enemies.every((enemy) => enemy.slowedTurnsRemaining > 0)).toBe(
			true,
		);
		expect(
			next.events.filter((event) => event.type === "enemy-held").length,
		).toBe(2);
	});

	it("using a held hold monster scroll with no visible enemy is a no-op (same reference, not consumed)", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			inventory: [{ itemId: 1, kind: "hold-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next).toBe(state);
	});
});
