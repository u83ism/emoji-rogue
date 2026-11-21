import { describe, expect, it } from "vitest";
import { advanceTurn } from "../../advanceTurn.js";
import {
	buildArenaGameState,
	buildDungeonGameState,
} from "../../initialState.js";

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
				{ itemId: 1, kind: "identify-potion-scroll" as const },
				{ itemId: 2, kind: "blindness" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, targetItemId: 2 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "blindness" }]);
		expect(next.identifiedItemKinds).toEqual([
			"blindness",
			"identify-potion-scroll",
		]);
		expect(next.events).toEqual([
			{ type: "item-kind-identified", payload: { kind: "blindness" } },
		]);
	});

	it("an identify scroll pointed at a potion already known is still used up", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			identifiedItemKinds: ["blindness"] as const,
			inventory: [
				{ itemId: 1, kind: "identify-potion-scroll" as const },
				{ itemId: 2, kind: "blindness" as const },
			],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1, targetItemId: 2 },
		});
		expect(next.inventory).toEqual([{ itemId: 2, kind: "blindness" }]);
		expect(next.identifiedItemKinds).toEqual([
			"blindness",
			"identify-potion-scroll",
		]);
	});

	it("an identify scroll with no potion pointed at is wasted", () => {
		for (const payload of [{ itemId: 1 }, { itemId: 1, targetItemId: 3 }]) {
			const state = {
				...buildArenaGameState(9, 3, 1),
				inventory: [
					{ itemId: 1, kind: "identify-potion-scroll" as const },
					{ itemId: 3, kind: "food" as const },
				],
			};
			const next = advanceTurn(state, {
				type: "use-item",
				payload,
			});
			expect(next.inventory).toEqual([{ itemId: 3, kind: "food" }]);
			expect(next.identifiedItemKinds).toEqual(["identify-potion-scroll"]);
			expect(next.events).toEqual([
				{ type: "scroll-wasted", payload: { kind: "identify-potion-scroll" } },
			]);
		}
	});

	it("a confuse monster scroll makes the hands glow, used up even with no monster around", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "confuse-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.nextHitConfuses).toBe(true);
		expect(next.events.map((event) => event.type)).toContain("hands-glowing");
	});

	it("a hold monster scroll stops every awake monster within 2 tiles, and only those", () => {
		const near = {
			x: 6,
			y: 4,
			kind: "zombie" as const,
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
		};
		const far = {
			x: 7,
			y: 4,
			kind: "bat" as const,
			hp: 1,
			maxHp: 1,
			awake: true,
			speed: "normal" as const,
			held: false,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			cancelled: false,
			invisible: false,
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
		/* the player stands at (4,4): the zombie 2 tiles away is held, the bat 3 away is not */
		expect(next.enemies.find((enemy) => enemy.kind === "zombie")?.held).toBe(
			true,
		);
		expect(next.enemies.find((enemy) => enemy.kind === "bat")?.held).toBe(
			false,
		);
		expect(next.events.filter((event) => event.type === "enemy-held")).toEqual([
			{ type: "enemy-held", payload: { target: "zombie" } },
		]);
	});

	it("a hold monster scroll with no awake monster near is wasted", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			inventory: [{ itemId: 1, kind: "hold-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "scroll-wasted", payload: { kind: "hold-monster-scroll" } },
		]);
	});

	it("a sleep scroll puts the player to sleep for 4..8 turns and takes the run flag", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerRunFlag: true,
			inventory: [{ itemId: 1, kind: "sleep-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		const [event] = next.events;
		if (event?.type !== "player-fell-asleep") {
			throw new Error("expected player-fell-asleep");
		}
		expect(event.payload.turns).toBeGreaterThanOrEqual(4);
		expect(event.payload.turns).toBeLessThanOrEqual(8);
		expect(next.playerRunFlag).toBe(false);
		expect(next.paralyzedTurnsRemaining).toBe(event.payload.turns - 1);
	});

	it("a create monster scroll puts a sleeping monster next to the player — or only a cry with no room", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "create-monster-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		const [created] = next.enemies;
		expect(created).toBeDefined();
		expect(Math.abs((created?.x ?? 99) - state.player.x)).toBeLessThanOrEqual(
			1,
		);
		expect(Math.abs((created?.y ?? 99) - state.player.y)).toBeLessThanOrEqual(
			1,
		);
		const cramped = {
			...buildArenaGameState(3, 3, 1),
			inventory: [{ itemId: 1, kind: "create-monster-scroll" as const }],
		};
		const cried = advanceTurn(cramped, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(cried.enemies).toEqual([]);
		expect(cried.events[0]).toEqual({
			type: "monster-created",
			payload: { target: undefined },
		});
	});

	it("an aggravate monsters scroll wakes every monster on the floor", () => {
		const sleeper = {
			x: 1,
			y: 1,
			kind: "zombie" as const,
			hp: 9,
			maxHp: 9,
			awake: false,
			speed: "normal" as const,
			held: true,
			carried: [],
			mean: false,
			gazeUsed: false,
			confused: false,
			cancelled: false,
			invisible: false,
		};
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [sleeper],
			inventory: [{ itemId: 1, kind: "aggravate-monsters-scroll" as const }],
		};
		const next = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(next.events[0]).toEqual({
			type: "monsters-aggravated",
			payload: {},
		});
		expect(next.enemies.every((enemy) => enemy.awake && !enemy.held)).toBe(
			true,
		);
	});
});

describe("the food detection scroll", () => {
	it("shows every ration for the turn, then the flash goes with the next command", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			items: [{ x: 7, y: 1, kind: "food" as const }],
			inventory: [{ itemId: 1, kind: "food-detection-scroll" as const }],
		};
		const read = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(read.sensedItems).toEqual([{ x: 7, y: 1, kind: "food" }]);
		expect(read.identifiedItemKinds).toContain("food-detection-scroll");
		expect(advanceTurn(read, { type: "wait" }).sensedItems).toEqual([]);
		/* a bump into a wall spends nothing: the flash stays */
		expect(
			advanceTurn(read, { type: "move", payload: { direction: "north" } }),
		).toBe(read);
	});

	it("only tingles with no food on the floor, staying unknown", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [{ itemId: 1, kind: "food-detection-scroll" as const }],
		};
		const read = advanceTurn(state, {
			type: "use-item",
			payload: { itemId: 1 },
		});
		expect(read.sensedItems).toEqual([]);
		expect(read.identifiedItemKinds).toEqual([]);
	});
});
