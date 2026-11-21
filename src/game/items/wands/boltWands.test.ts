import { describe, expect, it } from "vitest";
import { seedToState, stepUniform } from "../../../rng.js";
import { buildArenaGameState } from "../../initialState.js";
import type { Enemy, GameState } from "../../state.js";
import { applyBolt } from "./boltWands.js";

const monster = (kind: Enemy["kind"], x: number, y: number): Enemy => ({
	x,
	y,
	kind,
	hp: 200,
	maxHp: 200,
	awake: false,
	speed: "normal",
	held: false,
	carried: [],
	mean: false,
	gazeUsed: false,
	confused: false,
	cancelled: false,
	invisible: false,
});

/** Every event type of 300 bolts east, each off its own rng state. */
const collect = (state: GameState): Record<string, number> => {
	const counts: Record<string, number> = {};
	let rng = seedToState(1);
	for (let i = 0; i < 300; i++) {
		for (const event of applyBolt({ ...state, rng }, "east", "flame").events) {
			counts[event.type] = (counts[event.type] ?? 0) + 1;
		}
		rng = stepUniform(rng).state;
	}
	return counts;
};

describe("applyBolt", () => {
	it("strikes the first monster in its way for 6d6 as the player's hit, or whizzes past one that saves", () => {
		/* a 9x3 arena, the player at (4,1), a zombie at (6,1) */
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [monster("zombie", 6, 1)],
		};
		const counts = collect(state);
		expect(counts["bolt-hit"]).toBeGreaterThan(150);
		expect(counts["bolt-missed"]).toBeGreaterThan(20);
		let rng = seedToState(1);
		for (let i = 0; i < 20; i++) {
			const next = applyBolt({ ...state, rng }, "east", "flame");
			const hit = next.events.find((event) => event.type === "bolt-hit");
			if (hit !== undefined && hit.type === "bolt-hit") {
				expect(next.enemies[0]?.hp).toBe(200 - hit.payload.damage);
				expect(hit.payload.damage).toBeGreaterThanOrEqual(6);
			}
			rng = stepUniform(rng).state;
		}
	});

	it("is turned aside by a dragon when it is a flame", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [monster("dragon", 6, 1)],
		};
		const counts = collect(state);
		expect(counts["bolt-deflected"]).toBeGreaterThan(100);
		expect(counts["bolt-hit"]).toBeUndefined();
	});

	it("comes back off the wall at the player, who dodges or takes it", () => {
		/* nothing in the way: it bounces off the east wall at x=8 and returns */
		const state = {
			...buildArenaGameState(9, 3, 1),
			player: { x: 6, y: 1 },
			playerHp: 500,
			playerMaxHp: 500,
		};
		const counts = collect(state);
		expect((counts["player-bolted"] ?? 0) + (counts["bolt-dodged"] ?? 0)).toBe(
			300,
		);
		expect(counts["player-bolted"]).toBeGreaterThan(counts["bolt-dodged"] ?? 0);
	});
});

describe("applyUseColdWand", () => {
	it("fires a ice bolt the chosen way, spending a charge for nothing with no direction", async () => {
		const { applyUseColdWand } = await import("./boltWands.js");
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [monster("zombie", 6, 1)],
		};
		expect(applyUseColdWand(state, undefined)).toBe(state);
		const zapped = applyUseColdWand(state, "east");
		expect(
			zapped.events.some(
				(event) =>
					(event.type === "bolt-hit" || event.type === "bolt-missed") &&
					event.payload.kind === "ice",
			),
		).toBe(true);
	});
});

describe("applyUseLightningWand", () => {
	it("fires a bolt bolt the chosen way, spending a charge for nothing with no direction", async () => {
		const { applyUseLightningWand } = await import("./boltWands.js");
		const state = {
			...buildArenaGameState(9, 3, 1),
			enemies: [monster("zombie", 6, 1)],
		};
		expect(applyUseLightningWand(state, undefined)).toBe(state);
		const zapped = applyUseLightningWand(state, "east");
		expect(
			zapped.events.some(
				(event) =>
					(event.type === "bolt-hit" || event.type === "bolt-missed") &&
					event.payload.kind === "bolt",
			),
		).toBe(true);
	});
});
