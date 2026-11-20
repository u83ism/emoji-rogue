import { describe, expect, it } from "vitest";
import { type RngState, seedToState, stepUniform } from "../rng.js";
import { advanceTurn } from "./advanceTurn.js";
import {
	BEAR_TRAP_STUCK_TURNS,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
} from "./balance.js";
import type { TrapKind } from "./events.js";
import { buildFrameGrid } from "./frame.js";
import { TRAP_CELL } from "./glyphs.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import { applySearch } from "./search.js";
import type { Action, Direction, GameState } from "./state.js";

/** Levels at which a dart's or arrow's to-hit chance clamps to 100% / 0% (see combat/hitChance.ts). */
const SURE_HIT_LEVEL = 30;
const SURE_MISS_LEVEL = -30;

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

/** A 9x3 corridor, the player at (4,1), a hidden \`kind\` trap one step east. */
const withTrapEast = (kind: TrapKind, overrides: Partial<GameState> = {}) => ({
	...buildArenaGameState(9, 3, 1),
	traps: [{ x: 5, y: 1, kind, seen: false }],
	...overrides,
});

describe("applyTrapTrigger", () => {
	it("a sprung trap is seen from then on, stays armed, and springs again on the next step onto it", () => {
		const state = withTrapEast("dart", { playerLevel: SURE_HIT_LEVEL });
		const sprung = advanceTurn(state, move("east"));
		expect(sprung.traps).toEqual([{ x: 5, y: 1, kind: "dart", seen: true }]);
		const damage = state.playerHp - sprung.playerHp;
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(4);
		const back = advanceTurn(advanceTurn(sprung, move("west")), move("east"));
		expect(
			back.events.filter((event) => event.type === "trap-triggered"),
		).toHaveLength(2);
	});

	it("a dart or arrow that misses does no harm; a missed arrow drops at the player's feet", () => {
		const dart = advanceTurn(
			withTrapEast("dart", { playerLevel: SURE_MISS_LEVEL }),
			move("east"),
		);
		expect(dart.events[0]).toEqual({
			type: "trap-triggered",
			payload: { kind: "dart", damage: 0 },
		});
		const arrow = advanceTurn(
			withTrapEast("arrow", { playerLevel: SURE_MISS_LEVEL }),
			move("east"),
		);
		expect(arrow.items).toEqual([
			{
				x: 5,
				y: 1,
				kind: "weapon",
				identity: expect.objectContaining({ weaponKind: "arrow", quantity: 1 }),
			},
		]);
	});

	it("an arrow that hits does 1d6", () => {
		const state = withTrapEast("arrow", { playerLevel: SURE_HIT_LEVEL });
		const next = advanceTurn(state, move("east"));
		const damage = state.playerHp - next.playerHp;
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(6);
		expect(next.items).toEqual([]);
	});

	it("a bear trap holds the player: moves fail and use the hold up, other actions still work", () => {
		const caught = advanceTurn(withTrapEast("bear"), move("east"));
		expect(caught.stuckTurnsRemaining).toBe(BEAR_TRAP_STUCK_TURNS);
		expect(caught.paralyzedTurnsRemaining).toBe(0);
		const tried = advanceTurn(caught, move("east"));
		expect(tried.player).toEqual(caught.player);
		expect(tried.stuckTurnsRemaining).toBe(BEAR_TRAP_STUCK_TURNS - 1);
		expect(tried.events).toContainEqual({ type: "player-stuck", payload: {} });
		let free = tried;
		for (let attempt = 1; attempt < BEAR_TRAP_STUCK_TURNS; attempt++) {
			free = advanceTurn(free, move("east"));
		}
		expect(advanceTurn(free, move("east")).player).toEqual({ x: 6, y: 1 });
	});

	it("sleeping gas puts the player to sleep and takes the run flag away", () => {
		const next = advanceTurn(
			withTrapEast("sleeping-gas", { playerRunFlag: true }),
			move("east"),
		);
		/* the turn's countdown already ticked once */
		expect(next.paralyzedTurnsRemaining).toBe(
			SLEEPING_GAS_TRAP_PARALYSIS_DURATION - 1,
		);
		expect(next.playerRunFlag).toBe(false);
	});

	it("a mysterious trap only gives a sensation", () => {
		const state = withTrapEast("mysterious");
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.events.map((event) => event.type)).toEqual([
			"trap-triggered",
			"trap-mystery",
		]);
	});

	it("a teleport trap moves the player, and a trapdoor drops them a floor", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const east = { x: start.player.x + 1, y: start.player.y };
		const teleported = advanceTurn(
			{ ...start, traps: [{ ...east, kind: "teleport", seen: false }] },
			move("east"),
		);
		expect(teleported.events).toContainEqual(
			expect.objectContaining({ type: "player-teleported" }),
		);
		const fallen = advanceTurn(
			{ ...start, traps: [{ ...east, kind: "trapdoor", seen: false }] },
			move("east"),
		);
		expect(fallen.floor).toBe(2);
	});

	it("levitating, the player floats over a trap without springing it", () => {
		const next = advanceTurn(
			withTrapEast("bear", { levitationTurnsRemaining: 5 }),
			move("east"),
		);
		expect(next.stuckTurnsRemaining).toBe(0);
		expect(next.traps[0]?.seen).toBe(false);
	});

	it("a found trap is drawn on the map", () => {
		const hidden = withTrapEast("rust");
		expect(buildFrameGrid(hidden)[1]?.[5]).not.toEqual(TRAP_CELL);
		const found = {
			...hidden,
			traps: [{ x: 5, y: 1, kind: "rust" as const, seen: true }],
		};
		expect(buildFrameGrid(found)[1]?.[5]).toEqual(TRAP_CELL);
	});
});

describe("applySearch", () => {
	/** How many of `tries` searches (each from a different rng state) find the trap next to the player. */
	const countFinds = (state: GameState, tries: number): number => {
		let rng: RngState = seedToState(9);
		let finds = 0;
		for (let attempt = 0; attempt < tries; attempt++) {
			if (applySearch({ ...state, rng }).traps[0]?.seen) {
				finds += 1;
			}
			rng = stepUniform(rng).state;
		}
		return finds;
	};

	it("finds a hidden trap next to the player about half the time, less while blind", () => {
		const state = withTrapEast("dart");
		const sighted = countFinds(state, 400);
		expect(sighted).toBeGreaterThan(150);
		expect(sighted).toBeLessThan(250);
		const blind = countFinds({ ...state, blindTurnsRemaining: 10 }, 400);
		expect(blind).toBeLessThan(sighted);
	});

	it("never finds a trap out of reach, and the s key spends a turn", () => {
		const far = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 7, y: 1, kind: "dart" as const, seen: false }],
		};
		expect(countFinds(far, 50)).toBe(0);
		const searched = advanceTurn(far, { type: "search" });
		expect(searched.playerFood).toBe(far.playerFood - 1);
	});
});
