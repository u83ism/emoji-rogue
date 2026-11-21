import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../../rng.js";
import { buildArenaGameState } from "../initialState.js";
import type { Enemy, GameState } from "../state.js";
import { applyMedusaGaze } from "./medusaGaze.js";

const medusa = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "medusa",
	hp: 30,
	maxHp: 30,
	awake: true,
	speed: "normal",
	held: false,
	carried: [],
	mean: true,
	gazeUsed: false,
	confused: false,
	invisible: false,
});

/* a 9x5 arena — one lit room — the player at (4,2) */
const arena = (overrides: Partial<GameState> = {}): GameState => ({
	...buildArenaGameState(9, 5, 1),
	...overrides,
});

/** The first of successive rng states from seed 1 for which `isWanted` holds. */
const findRng = (isWanted: (rng: RngState) => boolean): RngState => {
	let rng = seedToState(1);
	for (let i = 0; i < 500; i++) {
		if (isWanted(rng)) {
			return rng;
		}
		rng = stepUniform(rng).state;
	}
	throw new Error("no such rng state");
};

const confuses = (state: GameState, enemy: Enemy) => (rng: RngState) =>
	applyMedusaGaze({ ...state, rng }, enemy).state.confusedTurnsRemaining >
	state.confusedTurnsRemaining;

describe("applyMedusaGaze", () => {
	it("confuses the player in a lit room for spread(20) turns, once", () => {
		const far = medusa(7, 3);
		const base = arena();
		const rng = findRng(confuses(base, far));
		const gazed = applyMedusaGaze({ ...base, rng }, far);
		expect(gazed.enemy.gazeUsed).toBe(true);
		expect(gazed.state.confusedTurnsRemaining).toBeGreaterThanOrEqual(19);
		expect(gazed.state.confusedTurnsRemaining).toBeLessThanOrEqual(20);
		expect(gazed.state.events.at(-1)?.type).toBe("player-gazed");
		/* spent: the next look does nothing */
		expect(applyMedusaGaze(gazed.state, gazed.enemy).state).toBe(gazed.state);
	});

	it("can be resisted with a save against magic, the gaze still spent", () => {
		const far = medusa(7, 3);
		const base = arena();
		const rng = findRng((candidate) => !confuses(base, far)(candidate));
		const gazed = applyMedusaGaze({ ...base, rng }, far);
		expect(gazed.enemy.gazeUsed).toBe(true);
		expect(gazed.state.confusedTurnsRemaining).toBe(0);
	});

	it("adds to a confusion already running", () => {
		const far = medusa(7, 3);
		const base = arena({ confusedTurnsRemaining: 5 });
		const rng = findRng(confuses(base, far));
		const gazed = applyMedusaGaze({ ...base, rng }, far);
		expect(gazed.state.confusedTurnsRemaining).toBeGreaterThanOrEqual(24);
	});

	it("does nothing asleep, to a blind or hallucinating player, or from afar in the dark", () => {
		const far = medusa(7, 3);
		const asleep = { ...far, awake: false };
		const base = arena();
		expect(applyMedusaGaze(base, asleep).state).toBe(base);
		const blind = arena({ blindTurnsRemaining: 3 });
		expect(applyMedusaGaze(blind, far).state).toBe(blind);
		const seeing = arena({ hallucinatingTurnsRemaining: 3 });
		expect(applyMedusaGaze(seeing, far).state).toBe(seeing);
		const dark = arena({ rooms: [{ x1: 1, y1: 1, x2: 7, y2: 3, dark: true }] });
		expect(applyMedusaGaze(dark, far).state).toBe(dark);
		/* right next to the player it gazes even in the dark */
		expect(applyMedusaGaze(dark, medusa(5, 3)).enemy.gazeUsed).toBe(true);
	});
});
