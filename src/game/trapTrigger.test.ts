import { describe, expect, it } from "vitest";
import { advanceTurn } from "./advanceTurn.js";
import {
	BEAR_TRAP_PARALYSIS_DURATION,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
} from "./balance.js";
import { buildArenaGameState, buildDungeonGameState } from "./initialState.js";
import type { Action, Direction, Enemy } from "./state.js";

/** Levels at which a dart trap's to-hit chance clamps to 100% / 0% (see items/hitChance.ts). */
const SURE_HIT_LEVEL = 30;
const SURE_MISS_LEVEL = -30;

const move = (direction: Direction): Action => ({
	type: "move",
	payload: { direction },
});

const zombie = (x: number, y: number): Enemy => ({
	x,
	y,
	kind: "zombie",
	hp: 2,
	maxHp: 2,
	awake: true,
	slowedTurnsRemaining: 0,
	confusedTurnsRemaining: 0,
});

describe("applyTrapTrigger", () => {
	it("stepping onto a hidden trap springs it: damage dealt, trap consumed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerLevel: SURE_HIT_LEVEL,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.traps).toEqual([]);
		const damage = state.playerHp - next.playerHp;
		/* a dart trap that hits rolls 1d4 */
		expect(damage).toBeGreaterThanOrEqual(1);
		expect(damage).toBeLessThanOrEqual(4);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage } },
		]);
	});

	it("a dart that hits may also drain a point of strength, unless the poison save passes", () => {
		const outcomes = Array.from({ length: 40 }, (_, seed) => {
			const state = {
				...buildArenaGameState(9, 3, seed + 1),
				playerLevel: SURE_HIT_LEVEL,
				traps: [{ x: 5, y: 1, kind: "dart" as const }],
			};
			const next = advanceTurn(state, move("east"));
			const lost = state.playerStrength - next.playerStrength;
			expect(next.playerMaxStrength).toBe(state.playerMaxStrength);
			expect(
				next.events.some((event) => event.type === "player-strength-drained"),
			).toBe(lost > 0);
			return lost;
		});
		expect(outcomes.every((lost) => lost === 0 || lost === 1)).toBe(true);
		/* at level 30 the poison save always passes — see the next test for a failing one */
		expect(outcomes.every((lost) => lost === 0)).toBe(true);
	});

	it("a low-level player usually fails the poison save and loses strength to a hitting dart", () => {
		const losses = Array.from({ length: 40 }, (_, seed) => {
			const state = {
				...buildArenaGameState(9, 3, seed + 1),
				playerLevel: 1,
				/* armor so soft every dart hits */
				inventory: [],
				playerHp: 100,
				playerMaxHp: 100,
				traps: [{ x: 5, y: 1, kind: "dart" as const }],
			};
			const next = advanceTurn(state, move("east"));
			const hit = next.playerHp < state.playerHp;
			return hit ? state.playerStrength - next.playerStrength : undefined;
		}).filter((lost) => lost !== undefined);
		expect(losses.length).toBeGreaterThan(10);
		/* the save passes 35% of the time at level 1 */
		const drained = losses.filter((lost) => lost === 1).length;
		expect(drained).toBeGreaterThan(losses.length / 3);
		expect(drained).toBeLessThan(losses.length);
	});

	it("a dart trap's dart can miss: no damage, trap still consumed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerLevel: SURE_MISS_LEVEL,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.traps).toEqual([]);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "dart", damage: 0 } },
		]);
	});

	it("a fatal trap ends the run without a bonus enemy hit the same turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			playerHp: 1,
			playerLevel: SURE_HIT_LEVEL,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
			enemies: [zombie(6, 1)] /* would be adjacent after the move */,
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(0);
		expect(next.status).toBe("dead");
		expect(next.events.map((event) => event.type)).toEqual([
			"trap-triggered",
			"player-died",
		]);
	});

	it("stepping onto a trapdoor drops the player to the next floor (no damage)", () => {
		/* descendStairs' floor generation needs digger-sized dimensions, unlike
		 * the tiny arena fixture used by the other trap tests above */
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			playerHp: 4,
			traps: [
				{ x: start.player.x + 1, y: start.player.y, kind: "trapdoor" as const },
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(state.floor + 1);
		expect(next.playerHp).toBe(4); /* the new floor's enemies wait a turn */
		expect(next.terrain).not.toEqual(state.terrain);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "trapdoor", damage: 0 } },
			{ type: "floor-descended", payload: { floor: state.floor + 1 } },
		]);
	});

	it("stepping onto a teleport trap relocates the player without damage", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			traps: [{ x: 5, y: 4, kind: "teleport" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp); /* no damage */
		expect(next.traps).toEqual([]); /* consumed */
		expect(next.player).not.toEqual({ x: 5, y: 4 }); /* relocated elsewhere */
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "teleport", damage: 0 } },
			{
				type: "player-teleported",
				payload: {
					x: next.player.x,
					y: next.player.y,
					source: "teleport-trap",
				},
			},
		]);
	});

	it("levitating floats over a teleport trap: no relocation, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 9, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 4, kind: "teleport" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 4 });
		expect(next.traps).toEqual(state.traps); /* untouched, still hidden */
		expect(next.events.some((event) => event.type === "trap-triggered")).toBe(
			false,
		);
	});

	it("levitating floats over a dart trap: no damage, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 1, kind: "dart" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.playerHp).toBe(state.playerHp);
		expect(next.traps).toEqual(state.traps); /* untouched, still hidden */
		expect(next.events.some((event) => event.type === "trap-triggered")).toBe(
			false,
		);
	});

	it("stepping onto a bear trap paralyzes the player without damage", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "bear" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp); /* no damage */
		expect(next.traps).toEqual([]); /* consumed */
		/* applyTurnEndTicks' paralysis tick runs the same turn it's set, so the
		 * duration is already one lower — same idiom as the slow wand. */
		expect(next.paralyzedTurnsRemaining).toBe(BEAR_TRAP_PARALYSIS_DURATION - 1);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "bear", damage: 0 } },
		]);
	});

	it("a paralyzed player from a bear trap cannot move on the following turn", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "bear" as const }],
		};
		const afterTrap = advanceTurn(state, move("east"));
		const afterBlockedMove = advanceTurn(afterTrap, move("east"));
		expect(afterBlockedMove.player).toEqual(afterTrap.player);
	});

	it("levitating floats over a bear trap: no paralysis, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 1, kind: "bear" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.paralyzedTurnsRemaining).toBe(0);
		expect(next.traps).toEqual(state.traps);
	});

	it("levitating floats over a trapdoor: no forced descent", () => {
		const start = buildDungeonGameState(40, 20, 12345);
		const state = {
			...start,
			levitationTurnsRemaining: 5,
			traps: [
				{ x: start.player.x + 1, y: start.player.y, kind: "trapdoor" as const },
			],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.floor).toBe(state.floor); /* did not fall */
		expect(next.player).toEqual({
			x: start.player.x + 1,
			y: start.player.y,
		});
		expect(next.traps).toEqual(state.traps);
	});

	it("stepping onto a sleeping gas trap paralyzes the player without damage", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "sleeping-gas" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp); /* no damage */
		expect(next.traps).toEqual([]); /* consumed */
		/* applyTurnEndTicks' paralysis tick runs the same turn it's set, so the
		 * duration is already one lower — same idiom as the bear trap. */
		expect(next.paralyzedTurnsRemaining).toBe(
			SLEEPING_GAS_TRAP_PARALYSIS_DURATION - 1,
		);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "sleeping-gas", damage: 0 } },
		]);
	});

	it("levitating floats over a sleeping gas trap: no paralysis, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			levitationTurnsRemaining: 5,
			traps: [{ x: 5, y: 1, kind: "sleeping-gas" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.paralyzedTurnsRemaining).toBe(0);
		expect(next.traps).toEqual(state.traps);
	});

	it("stepping onto a rust trap degrades the equipped armor's defenseBonus without damage", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: true,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: 2,
					rustProtected: false,
				},
			],
			traps: [{ x: 5, y: 1, kind: "rust" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.playerHp).toBe(state.playerHp); /* no damage */
		expect(next.traps).toEqual([]); /* consumed */
		expect(next.inventory).toEqual([
			{
				itemId: 1,
				kind: "armor",
				equipped: true,
				cursed: false,
				armorKind: "ring-mail" as const,
				defenseBonus: 1,
				rustProtected: false,
			},
		]);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "rust", damage: 0 } },
			{ type: "armor-rusted", payload: { amount: 1 } },
		]);
	});

	it("a rust trap is a no-op beyond the trap-triggered event when the equipped armor is protected", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: true,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: 2,
					rustProtected: true,
				},
			],
			traps: [{ x: 5, y: 1, kind: "rust" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual(state.inventory);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "rust", damage: 0 } },
		]);
	});

	it("a rust trap with no armor equipped is a no-op beyond the trap-triggered event", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			traps: [{ x: 5, y: 1, kind: "rust" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.inventory).toEqual([]);
		expect(next.events).toEqual([
			{ type: "trap-triggered", payload: { kind: "rust", damage: 0 } },
		]);
	});

	it("levitating floats over a rust trap: no rust, trap left armed", () => {
		const state = {
			...buildArenaGameState(9, 3, 1),
			levitationTurnsRemaining: 5,
			inventory: [
				{
					itemId: 1,
					kind: "armor" as const,
					equipped: true,
					cursed: false,
					armorKind: "ring-mail" as const,
					defenseBonus: 2,
					rustProtected: false,
				},
			],
			traps: [{ x: 5, y: 1, kind: "rust" as const }],
		};
		const next = advanceTurn(state, move("east"));
		expect(next.player).toEqual({ x: 5, y: 1 });
		expect(next.inventory).toEqual(state.inventory);
		expect(next.traps).toEqual(state.traps);
	});
});
