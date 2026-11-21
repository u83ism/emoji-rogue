import { describe, expect, it } from "vitest";
import { seedToState, stepUniform } from "../rng.js";
import { advanceEnemies } from "./enemies/enemies.js";
import { buildArenaGameState } from "./initialState.js";
import type { Enemy, GameState } from "./state.js";

const dragon = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "dragon",
	hp: 100,
	maxHp: 100,
	awake: true,
	speed: "normal",
	held: false,
	carried: [],
	mean: true,
	gazeUsed: false,
	confused: false,
});

/* a 20x5 arena — one lit room — the player moved to (4,2), with HP to spare */
const arena = (enemy: Enemy): GameState => ({
	...buildArenaGameState(20, 5, 1),
	player: { x: 4, y: 2 },
	playerHp: 500,
	playerMaxHp: 500,
	enemies: [enemy],
});

/** The flame events over 300 successive rng states. */
const countFlames = (enemy: Enemy) => {
	let rng = seedToState(1);
	let flamed = 0;
	let dodged = 0;
	for (let i = 0; i < 300; i++) {
		const next = advanceEnemies({ ...arena(enemy), rng });
		for (const event of next.events) {
			if (event.type === "player-flamed") {
				flamed++;
				expect(event.payload.damage).toBeGreaterThanOrEqual(6);
				expect(event.payload.damage).toBeLessThanOrEqual(36);
			}
			if (event.type === "flame-dodged") {
				dodged++;
			}
		}
		rng = stepUniform(rng).state;
	}
	return { flamed, dodged };
};

describe("a dragon's flame", () => {
	it("comes one turn in five from a dragon in line and in reach, mostly landing", () => {
		const { flamed, dodged } = countFlames(dragon(9, 2)); /* 5 tiles east */
		expect(flamed + dodged).toBeGreaterThan(40);
		expect(flamed + dodged).toBeLessThan(85);
		/* a level 1 player dodges with a 20% save */
		expect(flamed).toBeGreaterThan(dodged);
	});

	it("never comes off the line or from beyond BOLT_LENGTH", () => {
		expect(countFlames(dragon(9, 3))).toEqual({ flamed: 0, dodged: 0 });
		expect(countFlames(dragon(11, 2))).toEqual({ flamed: 0, dodged: 0 });
	});
});

describe("a bounced flame", () => {
	it("passes a monster on the way out, then strikes it coming back — a hit of the player's", () => {
		/* a 9x3 corridor-like room: the player at (2,1) against the west wall,
		 * a zombie at (3,1), the dragon at (4,1); the player always dodges
		 * (level 30 with a ring of protection), so the flame flies on, bounces
		 * off the wall and comes back through the zombie */
		const base: GameState = {
			...buildArenaGameState(9, 3, 1),
			player: { x: 2, y: 1 },
			playerLevel: 30,
			playerHp: 500,
			playerMaxHp: 500,
			inventory: [
				{
					itemId: 1,
					kind: "protection-ring",
					equipped: true,
					cursed: false,
					bonus: 2,
				},
			],
		};
		const zombie: Enemy = {
			...dragon(3, 1),
			kind: "zombie",
			hp: 200,
			maxHp: 200,
			mean: false,
		};
		let rng = seedToState(1);
		let struck = 0;
		for (let i = 0; i < 300; i++) {
			const next = advanceEnemies({
				...base,
				rng,
				enemies: [zombie, dragon(4, 1)],
			});
			const flamed = next.events.find((event) => event.type === "enemy-flamed");
			if (flamed !== undefined) {
				struck++;
				expect(next.enemies[0]?.hp).toBeLessThan(200);
				expect(next.events.map((event) => event.type)).toContain(
					"flame-dodged",
				);
			}
			rng = stepUniform(rng).state;
		}
		expect(struck).toBeGreaterThan(10);
	});
});
